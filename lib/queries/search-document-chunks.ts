import { pool } from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings/generate-embedding";

export type SearchResult = {
  id: number;
  document_id: string;
  filename: string;
  content: string;
  page_number: number | null;
  chunk_index: number;
  similarity: number;
};

export async function searchDocumentChunks(
  question: string,
  limit: number = 5,
  similarityThreshold: number = 0.25,
): Promise<SearchResult[]> {
  const query = question.trim();

  if (!query) {
    throw new Error("Search query cannot be empty");
  }

  if (similarityThreshold < 0 || similarityThreshold > 1) {
    throw new Error("Similarity threshold must be between 0 and 1");
  }

  const embedding = await generateEmbedding(query);

  const result = await pool.query(
    `
      WITH ranked_chunks AS (
        SELECT
          dc.id,
          dc.document_id,
          d.filename,
          dc.content,
          dc.page_number,
          dc.chunk_index,
          1 - (dc.embedding <=> $1::vector) AS similarity
        FROM public.document_chunks dc
        INNER JOIN public.documents d
          ON d.id = dc.document_id
        WHERE dc.embedding IS NOT NULL
      )
      SELECT *
      FROM ranked_chunks
      WHERE similarity >= $2
      ORDER BY similarity DESC
      LIMIT $3
    `,
    [`[${embedding.join(",")}]`, similarityThreshold, limit],
  );

  return result.rows as SearchResult[];
}