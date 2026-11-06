import { readFile } from "fs/promises";
import { PDFParse } from "pdf-parse";

export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export type ExtractedPdfResult = {
  totalPages: number;
  pages: ExtractedPdfPage[];
  fullText: string;
};

export async function extractPdfText(
  filePath: string,
): Promise<ExtractedPdfResult> {
  let parser: PDFParse | undefined;

  try {
    const buffer = await readFile(filePath);

    parser = new PDFParse({
      data: new Uint8Array(buffer),
    });

    const result = await parser.getText();

    const pages: ExtractedPdfPage[] = result.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    }));

    const fullText = pages
      .map((page) => page.text)
      .filter(Boolean)
      .join("\n\n");

    return {
      totalPages: pages.length,
      pages,
      fullText,
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}
