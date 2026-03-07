import { NextResponse } from "next/server";
import { Readable } from "node:stream";
// Use Next.js's bundled busboy to avoid an extra dependency and to bypass
// the body-size limit that request.formData() hits for files > ~4 MB.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const busboy = require("next/dist/compiled/busboy") as any;
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

type ParsedForm = {
  fileBuffer: Buffer;
  mimeType: string;
  title: string;
  language: string;
  description: string | null;
};

/**
 * Parse a multipart/form-data request using busboy.
 *
 * We read the raw body with request.arrayBuffer() first (binary-safe, no
 * multipart overhead, so no Next.js 4 MB formData limit applies), then wrap
 * it in Readable.from() before piping to busboy. This avoids the
 * "Unexpected end of form" error that occurs when using Readable.fromWeb()
 * on Next.js's internally-buffered Web ReadableStream.
 */
async function parseMultipart(request: Request): Promise<ParsedForm> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    throw new Error("Expected multipart/form-data");
  }

  // Read raw bytes — arrayBuffer() is not subject to the multipart-parse limit
  const rawBody = Buffer.from(await request.arrayBuffer());

  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: { "content-type": contentType }, limits: { fileSize: MAX_FILE_SIZE } });

    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let mimeType = "";

    bb.on("file", (_field: string, stream: NodeJS.ReadableStream, info: { mimeType: string }) => {
      mimeType = info.mimeType;
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => { fileBuffer = Buffer.concat(chunks); });
      stream.on("error", reject);
    });

    bb.on("field", (name: string, value: string) => { fields[name] = value; });

    bb.on("finish", () => {
      if (!fileBuffer) return reject(new Error("No file received"));
      const title = fields.title?.trim() ?? "";
      if (!title) return reject(new Error("title is required"));
      resolve({
        fileBuffer,
        mimeType,
        title,
        language: fields.language ?? "no",
        description: fields.description?.trim() || null,
      });
    });

    bb.on("error", reject);

    // Wrap the complete buffer in a Node.js Readable — reliable, no stream
    // conversion quirks from Readable.fromWeb() on Next.js's wrapped body.
    Readable.from(rawBody).pipe(bb);
  });
}

// Allow up to 60 s for large PDF ingestion (embedding many chunks takes time)
export const maxDuration = 60;

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

  // ── Parse multipart form (streaming via busboy) ───────────────────────────
  let parsed: ParsedForm;
  try {
    parsed = await parseMultipart(request);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid form data";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { fileBuffer, mimeType, title, language, description } = parsed;

  if (!["no", "en"].includes(language)) {
    return NextResponse.json({ error: "language must be 'no' or 'en'" }, { status: 400 });
  }
  if (mimeType !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (fileBuffer.length > MAX_FILE_SIZE) {
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
    const parser = new PDFParse({ data: fileBuffer });
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
          console.error("Embedding batch attempt failed:", { batchStart, attempt }, err);
          if (attempt === MAX_RETRIES) {
            failCount += batch.length;
            console.error("Skipping batch after max retries:", { batchStart, maxRetries: MAX_RETRIES });
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
