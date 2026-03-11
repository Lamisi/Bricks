import "server-only";
import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const EMBEDDING_MODEL = "voyage-3" as const;
export const EMBEDDING_DIMENSIONS = 1024 as const;

function getVoyageProvider() {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY environment variable is not set");
  }
  return createOpenAI({
    apiKey,
    baseURL: "https://api.voyageai.com/v1",
  });
}

function getEmbeddingModel() {
  return getVoyageProvider().embedding(EMBEDDING_MODEL);
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
