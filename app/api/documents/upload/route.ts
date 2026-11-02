import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createDocument } from "@/lib/queries/documents";
import { validateFileSignature } from "@/lib/validations/file";
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");

    // Check whether a file was provided
    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please upload a valid file" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Only PDF, DOCX, and TXT files are allowed" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "File must be between 1 byte and 5MB" },
        { status: 400 },
      );
    }

    // Create a unique filename
    const extension = path.extname(file.name).toLowerCase();
    const uniqueFilename = `${crypto.randomUUID()}${extension}`;

    // Convert uploaded file into a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate actual file content
    const isValidFile = validateFileSignature(buffer, file.type);

    if (!isValidFile) {
      return NextResponse.json(
        { message: "File content does not match its file type" },
        { status: 400 },
      );
    }

    // Save file locally
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueFilename);

    await writeFile(filePath, buffer);

    // Save metadata in PostgreSQL
    const document = await createDocument(
      file.name,
      file.type,
      file.size,
      uniqueFilename,
    );

    return NextResponse.json(
      {
        message: "Document uploaded successfully",
        document,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Document upload error:", error);

    return NextResponse.json(
      { message: "Document upload failed" },
      { status: 500 },
    );
  }
}
