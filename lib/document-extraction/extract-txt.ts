
import { readFile } from "fs/promises";

export type ExtractedTxtResult = {
  fullText: string;
};

function decodeTextFile(buffer: Buffer): string {
  // UTF-8 BOM
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return new TextDecoder("utf-8").decode(buffer);
  }

  // UTF-16 Little Endian BOM
  if (
    buffer.length >= 2 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xfe
  ) {
    return new TextDecoder("utf-16le").decode(buffer);
  }

  // UTF-16 Big Endian BOM
  if (
    buffer.length >= 2 &&
    buffer[0] === 0xfe &&
    buffer[1] === 0xff
  ) {
    return new TextDecoder("utf-16be").decode(buffer);
  }

  // Standard UTF-8
  try {
    return new TextDecoder("utf-8", {
      fatal: true,
    }).decode(buffer);
  } catch {
    // Fallback for older Windows text files.
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function normalizeTxtText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTxtText(
  filePath: string,
): Promise<ExtractedTxtResult> {
  try {
    const buffer = await readFile(filePath);

    const decodedText = decodeTextFile(buffer);
    const fullText = normalizeTxtText(decodedText);

    if (!fullText) {
      throw new Error("TXT file contains no readable text");
    }

    return {
      fullText,
    };
  } catch (error) {
    console.error("TXT extraction error:", error);

    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to extract text from TXT file",
    );
  }
}
