
import { NextRequest, NextResponse } from "next/server";
import { mkdtemp, writeFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { extractDocxText } from "@/lib/document-extraction/extract-docx";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let tempDir: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please upload a DOCX file" },
        { status: 400 },
      );
    }

    if (
      file.type !==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return NextResponse.json(
        { message: "Only DOCX files are allowed" },
        { status: 400 },
      );
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "File must be between 1 byte and 5MB" },
        { status: 400 },
      );
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), "docx-test-"));

    const filePath = path.join(tempDir, "test.docx");

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, buffer);

    const result = await extractDocxText(filePath);

    return NextResponse.json({
      message: "DOCX text extracted successfully",
      fullText: result.fullText,
    });
  } catch (error) {
    console.error("DOCX test extraction error:", error);

    return NextResponse.json(
      {
        message: "DOCX extraction failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
