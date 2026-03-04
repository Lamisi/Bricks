import "server-only";
import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const EMBEDDING_MODEL = "text-embedding-3-small" as const;
export const EMBEDDING_DIMENSIONS = 1536 as const;

function getOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return createOpenAI({ apiKey });
}

function getEmbeddingModel() {
  return getOpenAIProvider().embedding(EMBEDDING_MODEL);
}

/** Generate a single embedding vector for a text string. */
export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: text,
  });
  return embedding;
}

/** Generate embeddings for multiple texts in a single API call. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values: texts,
  });
  return embeddings;
}
