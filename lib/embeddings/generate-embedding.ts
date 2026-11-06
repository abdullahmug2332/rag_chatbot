import OpenAI from "openai";

const ollama = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL,
  apiKey: process.env.OLLAMA_API_KEY || "ollama",
});

const EMBEDDING_MODEL = "embeddinggemma";
const EMBEDDING_DIMENSIONS = 768;

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.trim();

  if (!input) {
    throw new Error("Text cannot be empty");
  }

  const result = await ollama.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });

  const embedding = result.data[0]?.embedding;

  if (!embedding) {
    throw new Error("No embedding returned by the API");
  }

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid embedding dimensions. Expected ${EMBEDDING_DIMENSIONS}, received ${embedding.length}`,
    );
  }

  return embedding;
}