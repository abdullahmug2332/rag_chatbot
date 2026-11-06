import { pool } from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings/generate-embedding";

export async function embedDocumentChunks(documentId: string) {
  // Get all chunks belonging to this document
  const result = await pool.query(
    `
      SELECT id, content
      FROM public.document_chunks
      WHERE document_id = $1
      ORDER BY chunk_index ASC
    `,
    [documentId],
  );

  const chunks = result.rows;

  if (chunks.length === 0) {
    throw new Error("No chunks found for this document");
  }

  let embeddedChunks = 0;

  // Generate and store embedding for each chunk
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);

    await pool.query(
      `
        UPDATE public.document_chunks
        SET embedding = $1::vector
        WHERE id = $2
      `,
      [`[${embedding.join(",")}]`, chunk.id],
    );

    embeddedChunks++;
  }

  return {
    documentId,
    totalChunks: chunks.length,
    embeddedChunks,
  };
}