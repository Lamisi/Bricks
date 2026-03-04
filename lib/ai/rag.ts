import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/ai/embeddings";

// ~500 tokens ≈ 2 000 characters; 50-token overlap ≈ 200 characters
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

export type MatchResult = {
  id: string;
  content: string;
  language: string;
  similarity: number;
  knowledge_source_id: string;
  knowledge_source_title: string;
};

/**
 * Splits text into overlapping chunks of approximately CHUNK_SIZE characters.
 * Splits on sentence boundaries where possible to avoid cutting mid-sentence.
 */
export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + CHUNK_SIZE;

    if (end < cleaned.length) {
      // Try to break at a sentence boundary (. ! ?) or paragraph
      const breakCandidates = [
        cleaned.lastIndexOf("\n\n", end),
        cleaned.lastIndexOf(". ", end),
        cleaned.lastIndexOf("! ", end),
        cleaned.lastIndexOf("? ", end),
      ].filter((i) => i > start + CHUNK_SIZE / 2);

      if (breakCandidates.length > 0) {
        end = Math.max(...breakCandidates) + 1;
      }
    }

    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);

    start = end - CHUNK_OVERLAP;
    if (start <= 0) break;
  }

  return chunks;
}

/**
 * Performs a semantic similarity search against the embeddings table.
 * Returns the top-K most relevant chunks for a given query text.
 */
export async function matchDocuments(
  queryText: string,
  matchCount: number = 5,
  language?: "no" | "en",
): Promise<MatchResult[]> {
  const queryEmbedding = await embedText(queryText);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("match_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: matchCount,
    filter_language: language ?? null,
  });

  if (error) {
    console.error("match_documents RPC error:", error);
    throw new Error("Similarity search failed");
  }

  return (data ?? []) as MatchResult[];
}
