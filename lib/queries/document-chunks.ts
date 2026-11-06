
import { pool } from "@/lib/db";
import type { DocumentChunk } from "@/lib/document-extraction/chunk-text";

export async function insertDocumentChunks(
  documentId: string,
  chunks: DocumentChunk[],
) {
  if (chunks.length === 0) {
    return 0;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const values: (string | number | null)[] = [];

    const placeholders = chunks.map((chunk, index) => {
      const offset = index * 4;

      values.push(
        documentId,
        index,
        chunk.content,
        chunk.pageNumber,
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    });

    await client.query(
      `
        INSERT INTO public.document_chunks
          (document_id, chunk_index, content, page_number)
        VALUES ${placeholders.join(", ")}
      `,
      values,
    );

    await client.query("COMMIT");

    return chunks.length;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Document chunks insertion error:", error);
    throw error;
  } finally {
    client.release();
  }
}
