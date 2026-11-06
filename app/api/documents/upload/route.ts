import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, rm } from "fs/promises";
import path from "path";

import {
  createDocument,
  deleteDocument,
  updateDocumentStatus,
} from "@/lib/queries/documents";

import { insertDocumentChunks } from "@/lib/queries/document-chunks";
import { extractDocument } from "@/lib/document-extraction/extract-document";
import { chunkText } from "@/lib/document-extraction/chunk-text";
import { validateFileSignature } from "@/lib/validations/file";
import { embedDocumentChunks } from "@/lib/embeddings/embed-document-chunks";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let filePath: string | undefined;
  let documentId: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please upload a valid file" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Only PDF, DOCX, and TXT files are allowed" },
        { status: 400 },
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "File must be between 1 byte and 5MB" },
        { status: 400 },
      );
    }

    const extension = path.extname(file.name).toLowerCase();
    const uniqueFilename = `${crypto.randomUUID()}${extension}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isValidFile = validateFileSignature(buffer, file.type);

    if (!isValidFile) {
      return NextResponse.json(
        { message: "File content does not match its file type" },
        { status: 400 },
      );
    }

    // Save physical file.
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });

    filePath = path.join(uploadDir, uniqueFilename);

    await writeFile(filePath, buffer);

    // Save document metadata.
    const document = await createDocument(
      file.name,
      file.type,
      file.size,
      uniqueFilename,
    );

    documentId = document.id;

    // Extract document text.
    const extractedDocument = await extractDocument(filePath, file.type);

    // Generate chunks while preserving page numbers.
    const chunks = extractedDocument.pages.flatMap((page) =>
      chunkText(page.text, {
        pageNumber: page.pageNumber,
      }),
    );

    if (chunks.length === 0) {
      throw new Error("No readable text found in document");
    }

    const insertedChunks = await insertDocumentChunks(documentId, chunks);

    // Generate and store embeddings for all document chunks
    const { embeddedChunks } = await embedDocumentChunks(documentId);

    if (embeddedChunks !== insertedChunks) {
      throw new Error("Not all document chunks were embedded");
    }

    const updatedDocument = await updateDocumentStatus(documentId, "processed");

    return NextResponse.json(
      {
        message: "Document uploaded and processed successfully",
        document: updatedDocument,
        totalChunks: insertedChunks,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Document upload and processing error:", error);

    // Clean up incomplete document record and its chunks.
    if (documentId) {
      try {
        await deleteDocument(documentId);
      } catch (cleanupError) {
        console.error("Document database cleanup error:", cleanupError);
      }
    }

    // Clean up physical file.
    if (filePath) {
      try {
        await rm(filePath, { force: true });
      } catch (cleanupError) {
        console.error("Document file cleanup error:", cleanupError);
      }
    }

    return NextResponse.json(
      { message: "Document upload or processing failed" },
      { status: 500 },
    );
  }
}
