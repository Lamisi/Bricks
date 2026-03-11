import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/lib/ai/rag";
import { embedBatch, EMBEDDING_MODEL } from "@/lib/ai/embeddings";
import type { Database } from "@/types/database";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const EMBED_BATCH_SIZE = 20;
const MAX_RETRIES = 3;

type Language = Database["public"]["Enums"]["language_code"];

// Allow up to 60 s for large PDF ingestion (chunking + embedding batches)
export const maxDuration = 60;

// POST /api/rag/ingest
// Body: { storagePath, title, language, description? }
//
// The PDF is NOT uploaded through this endpoint — the client uploads directly
// to Supabase Storage via a signed URL (/api/rag/upload-url), then calls this
// endpoint with the resulting storage path. This avoids Next.js body-size limits.
export async function POST(request: Request) {
  // ── Auth: global admin only ───────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Global admin access required" }, { status: 403 });
  }

  // ── Parse JSON body ───────────────────────────────────────────────────────
  let body: { storagePath?: string; title?: string; language?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { storagePath, title: rawTitle, language = "no", description } = body;
  const title = rawTitle?.trim() ?? "";

  if (!storagePath) return NextResponse.json({ error: "storagePath is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!["no", "en"].includes(language)) {
    return NextResponse.json({ error: "language must be 'no' or 'en'" }, { status: 400 });
  }

  if (!process.env.VOYAGE_API_KEY) {
    return NextResponse.json(
      { error: "VOYAGE_API_KEY is not configured. Add it to .env.local to enable PDF ingestion." },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const startTime = Date.now();

  // ── Download PDF from Storage ─────────────────────────────────────────────
  const { data: blob, error: downloadError } = await admin.storage
    .from("documents")
    .download(storagePath);

  if (downloadError || !blob) {
    console.error("Failed to download knowledge source PDF:", downloadError);
    return NextResponse.json({ error: "Could not retrieve uploaded file" }, { status: 500 });
  }

  const fileBuffer = Buffer.from(await blob.arrayBuffer());

  if (fileBuffer.length > MAX_FILE_SIZE) {
    await admin.storage.from("documents").remove([storagePath]);
    return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 400 });
  }

  // ── Create knowledge_source record ────────────────────────────────────────
  const { data: source, error: insertError } = await admin
    .from("knowledge_sources")
    .insert({
      title,
      description: description?.trim() || null,
      source_type: "pdf",
      language: language as Language,
      status: "processing",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !source) {
    console.error("knowledge_source insert error:", insertError);
    await admin.storage.from("documents").remove([storagePath]);
    return NextResponse.json({ error: "Could not create knowledge source" }, { status: 500 });
  }

  const sourceId = source.id;

  try {
    // ── Extract text from PDF ─────────────────────────────────────────────
    const parser = new PDFParse({ data: fileBuffer });
    const pdfData = await parser.getText();
    const rawText = pdfData.text;

    if (!rawText.trim()) {
      await admin
        .from("knowledge_sources")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", sourceId);
      await admin.storage.from("documents").remove([storagePath]);
      return NextResponse.json({ error: "No text content found in PDF" }, { status: 422 });
    }

    // ── Chunk text ────────────────────────────────────────────────────────
    const chunks = chunkText(rawText);
    console.log("Ingestion: extracted chunks", { sourceId, chunkCount: chunks.length });

    // ── Embed and store in batches ────────────────────────────────────────
    let successCount = 0;
    let failCount = 0;
    let lastEmbedError: string | null = null;

    for (let batchStart = 0; batchStart < chunks.length; batchStart += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(batchStart, batchStart + EMBED_BATCH_SIZE);
      let embeddings: number[][] | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          embeddings = await embedBatch(batch);
          lastEmbedError = null;
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Embedding batch attempt failed:", { batchStart, attempt }, err);
          lastEmbedError = msg;
          if (attempt === MAX_RETRIES) {
            failCount += batch.length;
          }
        }
      }

      if (!embeddings) continue;

      const rows = batch.map((content, i) => ({
        knowledge_source_id: sourceId,
        chunk_index: batchStart + i,
        content,
        language: language as Language,
        embedding: JSON.stringify(embeddings![i]),
        embedding_model: EMBEDDING_MODEL,
      }));

      const { error: embeddingError } = await admin.from("embeddings").insert(rows);
      if (embeddingError) {
        console.error("Embedding insert error:", embeddingError);
        failCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    // ── Finalize ──────────────────────────────────────────────────────────
    const finalStatus = failCount === 0 ? "ready" : successCount > 0 ? "partial" : "failed";

    await admin
      .from("knowledge_sources")
      .update({
        status: finalStatus,
        chunk_count: successCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    // Clean up the temporary upload file
    await admin.storage.from("documents").remove([storagePath]);

    const duration = Date.now() - startTime;
    console.log("Ingestion complete:", { sourceId, successCount, failCount, status: finalStatus, durationMs: duration });

    return NextResponse.json({
      sourceId,
      status: finalStatus,
      chunkCount: successCount,
      failedChunks: failCount,
      ...(lastEmbedError ? { embedError: lastEmbedError } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Ingestion error:", err);
    await admin
      .from("knowledge_sources")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", sourceId);
    await admin.storage.from("documents").remove([storagePath]);
    return NextResponse.json({ error: `Ingestion failed: ${message}` }, { status: 500 });
  }
}
