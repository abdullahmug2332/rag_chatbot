
import path from "path";
import { extractPdfText } from "./extract-pdf";
import { extractTxtText } from "./extract-txt";
import { extractDocxText } from "./extract-docx";

export type ExtractedDocument = {
  fullText: string;
  pages: {
    pageNumber: number | null;
    text: string;
  }[];
};

export async function extractDocument(
  filePath: string,
  fileType: string,
): Promise<ExtractedDocument> {
  const extension = path.extname(filePath).toLowerCase();

  if (
    fileType === "application/pdf" ||
    extension === ".pdf"
  ) {
    const result = await extractPdfText(filePath);

    return {
      fullText: result.fullText,
      pages: result.pages.map((page) => ({
        pageNumber: page.pageNumber,
        text: page.text,
      })),
    };
  }

  if (fileType === "text/plain" || extension === ".txt") {
    const result = await extractTxtText(filePath);

    return {
      fullText: result.fullText,
      pages: [
        {
          pageNumber: null,
          text: result.fullText,
        },
      ],
    };
  }

  if (
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  ) {
    const result = await extractDocxText(filePath);

    return {
      fullText: result.fullText,
      pages: [
        {
          pageNumber: null,
          text: result.fullText,
        },
      ],
    };
  }

  throw new Error("Unsupported document format");
}
