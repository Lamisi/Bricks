import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/lib/ai/rag";
import { embedBatch, EMBEDDING_MODEL } from "@/lib/ai/embeddings";
import type { Database } from "@/types/database";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const EMBED_BATCH_SIZE = 20; // embed 20 chunks per API call
const MAX_RETRIES = 3;

type Language = Database["public"]["Enums"]["language_code"];

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

  // ── Parse multipart form ──────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null)?.trim();
  const language = (formData.get("language") as string | null) ?? "no";
  const description = (formData.get("description") as string | null)?.trim() ?? null;

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!["no", "en"].includes(language)) {
    return NextResponse.json({ error: "language must be 'no' or 'en'" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 400 });
  }

  const admin = createAdminClient();
  const startTime = Date.now();

  // ── Create knowledge_source record ────────────────────────────────────────
  const { data: source, error: insertError } = await admin
    .from("knowledge_sources")
    .insert({
      title,
      description,
      source_type: "pdf",
      language: language as Language,
      status: "processing",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !source) {
    console.error("knowledge_source insert error:", insertError);
    return NextResponse.json({ error: "Could not create knowledge source" }, { status: 500 });
  }

  const sourceId = source.id;

  try {
    // ── Extract text from PDF ─────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    const rawText = pdfData.text;

    if (!rawText.trim()) {
      await admin
        .from("knowledge_sources")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", sourceId);
      return NextResponse.json({ error: "No text content found in PDF" }, { status: 422 });
    }

    // ── Chunk text ────────────────────────────────────────────────────────
    const chunks = chunkText(rawText);
    console.log("Ingestion: extracted chunks", { sourceId, chunkCount: chunks.length });

    // ── Embed and store in batches ────────────────────────────────────────
    let successCount = 0;
    let failCount = 0;

    for (let batchStart = 0; batchStart < chunks.length; batchStart += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(batchStart, batchStart + EMBED_BATCH_SIZE);
      let embeddings: number[][] | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          embeddings = await embedBatch(batch);
          break;
        } catch (err) {
          console.error(`Embedding batch [${batchStart}] attempt ${attempt} failed:`, err);
          if (attempt === MAX_RETRIES) {
            failCount += batch.length;
            console.error(`Skipping batch [${batchStart}] after ${MAX_RETRIES} retries`);
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

    // ── Finalize knowledge_source ─────────────────────────────────────────
    const finalStatus = failCount === 0 ? "ready" : successCount > 0 ? "partial" : "failed";

    await admin
      .from("knowledge_sources")
      .update({
        status: finalStatus,
        chunk_count: successCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    const duration = Date.now() - startTime;
    console.log("Ingestion complete:", {
      sourceId,
      totalChunks: chunks.length,
      successCount,
      failCount,
      status: finalStatus,
      durationMs: duration,
    });

    return NextResponse.json({
      sourceId,
      status: finalStatus,
      chunkCount: successCount,
      failedChunks: failCount,
    });
  } catch (err) {
    console.error("Ingestion error:", err);
    await admin
      .from("knowledge_sources")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", sourceId);

    return NextResponse.json(
      { error: "Ingestion failed. Please try again." },
      { status: 500 },
    );
  }
}
