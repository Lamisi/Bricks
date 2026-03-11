import "server-only";

export const EMBEDDING_MODEL = "voyage-3" as const;
export const EMBEDDING_DIMENSIONS = 1024 as const;

type VoyageEmbeddingResponse = {
  object: string;
  data: Array<{ object: string; embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
};

function getApiKey(): string {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY environment variable is not set");
  return apiKey;
}

async function voyageEmbed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL, input_type: "document" }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage AI error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as VoyageEmbeddingResponse;
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Generate a single embedding vector for a text string. */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await voyageEmbed([text]);
  return embedding;
}

/** Generate embeddings for multiple texts in a single API call. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  return voyageEmbed(texts);
}
