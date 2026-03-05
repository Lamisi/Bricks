import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/ai/embeddings";

/**
 * Generates (or refreshes) the search embedding for a document.
 * Called non-blocking after document create / update.
 * Silently no-ops if OpenAI is unavailable.
 */
export async function embedDocument(documentId: string, title: string, description?: string | null): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return;

  const text = [title, description].filter(Boolean).join(" — ");

  let embedding: number[];
  try {
    embedding = await embedText(text);
  } catch (err) {
    console.error("Doc embedding generation failed:", { documentId }, err);
    return;
  }

  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("doc_embeddings")
    .upsert(
      { document_id: documentId, embedding: JSON.stringify(embedding), updated_at: new Date().toISOString() },
      { onConflict: "document_id" },
    );

  if (error) {
    console.error("Doc embedding upsert failed:", { documentId }, error);
  }
}
