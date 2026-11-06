
import { NextRequest, NextResponse } from "next/server";
import { mkdtemp, writeFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { extractPdfText } from "@/lib/document-extraction/extract-pdf";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let tempDir: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please upload a PDF file" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { message: "Only PDF files are allowed" },
        { status: 400 },
      );
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "PDF must be between 1 byte and 5MB" },
        { status: 400 },
      );
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), "pdf-test-"));

    const filePath = path.join(tempDir, "test.pdf");

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, buffer);

    const result = await extractPdfText(filePath);

    return NextResponse.json({
      message: "PDF text extracted successfully",
      totalPages: result.totalPages,
      pages: result.pages,
      fullText: result.fullText,
    });
  } catch (error) {
    console.error("PDF test extraction error:", error);

    return NextResponse.json(
      { message: "PDF extraction failed" },
      { status: 500 },
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
