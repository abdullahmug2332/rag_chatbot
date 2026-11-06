
import { readFile } from "fs/promises";
import mammoth from "mammoth";

export type ExtractedDocxResult = {
  fullText: string;
};

function normalizeDocxText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/[ \t]+/g, " ")
    // DOCX paragraphs should remain separate for chunking.
    .replace(/\n[ \t]*\n+/g, "\n\n")
    .replace(/(?<!\n)\n(?!\n)/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractDocxText(
  filePath: string,
): Promise<ExtractedDocxResult> {
  try {
    const buffer = await readFile(filePath);

    const result = await mammoth.extractRawText({
      buffer,
    });

    const fullText = normalizeDocxText(result.value);

    if (!fullText) {
      throw new Error("DOCX file contains no readable text");
    }

    if (result.messages.length > 0) {
      console.warn("DOCX extraction warnings:", result.messages);
    }

    return {
      fullText,
    };
  } catch (error) {
    console.error("DOCX extraction error:", error);

    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to extract text from DOCX file",
    );
  }
}
