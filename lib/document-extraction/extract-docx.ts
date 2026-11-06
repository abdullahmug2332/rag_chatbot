
import mammoth from "mammoth";

export type ExtractedDocxResult = {
  fullText: string;
};

export async function extractDocxText(
  filePath: string,
): Promise<ExtractedDocxResult> {
  try {
    const result = await mammoth.extractRawText({
      path: filePath,
    });

    const fullText = result.value.trim();

    if (!fullText) {
      throw new Error("DOCX file contains no readable text");
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
