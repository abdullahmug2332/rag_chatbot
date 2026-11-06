
import { NextRequest, NextResponse } from "next/server";
import { mkdtemp, writeFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { extractTxtText } from "@/lib/document-extraction/extract-txt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let tempDir: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please upload a TXT file" },
        { status: 400 },
      );
    }

    if (file.type !== "text/plain") {
      return NextResponse.json(
        { message: "Only TXT files are allowed" },
        { status: 400 },
      );
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "File must be between 1 byte and 5MB" },
        { status: 400 },
      );
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), "txt-test-"));

    const filePath = path.join(tempDir, "test.txt");

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, buffer);

    const result = await extractTxtText(filePath);

    return NextResponse.json({
      message: "TXT text extracted successfully",
      fullText: result.fullText,
    });
  } catch (error) {
    console.error("TXT test extraction error:", error);

    return NextResponse.json(
      {
        message: "TXT extraction failed",
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
