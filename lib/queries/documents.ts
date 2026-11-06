import { pool } from "@/lib/db";

export type Document = {
  id: string;
  filename: string;
  stored_filename: string | null;
  file_type: string;
  file_size: string | null;
  status: string;
  created_at: Date;
};
export async function createDocument(
  filename: string,
  fileType: string,
  fileSize: number,
  storedFilename: string | null
) {
  const result = await pool.query(
    `INSERT INTO documents (
      filename,
      stored_filename,
      file_type,
      file_size,
      status
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [filename, storedFilename, fileType, fileSize, "pending"]
  );

  return result.rows[0] as Document;
}
export async function getDocuments() {
  const result = await pool.query(
    `SELECT *
     FROM documents
     ORDER BY created_at DESC`
  );

  return result.rows as Document[];
}
export async function deleteDocument(id: string) {
  const result = await pool.query(
    `DELETE FROM documents
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  return Boolean(result.rowCount);
}
export async function getDocumentById(id: string) {
  const result = await pool.query(
    `SELECT * FROM documents WHERE id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function updateDocumentStatus(
  id: string,
  status: string,
) {
  const result = await pool.query(
    `UPDATE documents
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [status, id],
  );

  return result.rows[0] as Document | undefined;
}
