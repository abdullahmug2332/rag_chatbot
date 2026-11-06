
import { readFile } from "fs/promises";

export type ExtractedTxtResult = {
  fullText: string;
};

export async function extractTxtText(
  filePath: string,
): Promise<ExtractedTxtResult> {
  try {
    const fullText = await readFile(filePath, "utf-8");

    if (!fullText.trim()) {
      throw new Error("TXT file contains no readable text");
    }

    return {
      fullText: fullText.trim(),
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
