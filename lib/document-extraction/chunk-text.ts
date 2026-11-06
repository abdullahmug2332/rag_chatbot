
export type DocumentChunk = {
  content: string;
  pageNumber: number | null;
};

type ChunkTextOptions = {
  maxChunkSize?: number;
  overlap?: number;
  pageNumber?: number | null;
};

const DEFAULT_MAX_CHUNK_SIZE = 1200;
const DEFAULT_OVERLAP = 150;

// Common document headings, including resume sections.
const SECTION_HEADING =
  /^(SUMMARY|PROFILE|ABOUT ME|EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT HISTORY|EDUCATION|PROJECTS|PERSONAL PROJECTS|SKILLS|TECHNICAL SKILLS|CERTIFICATIONS|LANGUAGES|HOBBIES|INTERESTS|CONTACT|OBJECTIVE|ACHIEVEMENTS|RESPONSIBILITIES|QUALIFICATIONS)\s*:?$/i;

function splitIntoSections(text: string): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: string[] = [];
  let currentSection: string[] = [];

  for (const line of lines) {
    const isHeading = SECTION_HEADING.test(line);

    if (isHeading && currentSection.length > 0) {
      sections.push(currentSection.join("\n"));
      currentSection = [];
    }

    currentSection.push(line);
  }

  if (currentSection.length > 0) {
    sections.push(currentSection.join("\n"));
  }

  return sections;
}

function splitLongSection(
  text: string,
  maxChunkSize: number,
  overlap: number,
): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // Split exceptionally long paragraphs by sentence.
    if (paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }

      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [
        paragraph,
      ];

      let sentenceChunk = "";

      for (const sentence of sentences) {
        const candidate = sentenceChunk
          ? `${sentenceChunk} ${sentence.trim()}`
          : sentence.trim();

        if (candidate.length > maxChunkSize && sentenceChunk) {
          chunks.push(sentenceChunk.trim());

          const previousWords = sentenceChunk
            .trim()
            .split(/\s+/)
            .slice(-20)
            .join(" ");

          sentenceChunk = previousWords
            ? `${previousWords} ${sentence.trim()}`
            : sentence.trim();
        } else {
          sentenceChunk = candidate;
        }
      }

      if (sentenceChunk.trim()) {
        chunks.push(sentenceChunk.trim());
      }

      continue;
    }

    const candidate = currentChunk
      ? `${currentChunk}\n\n${paragraph}`
      : paragraph;

    if (candidate.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk = candidate;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export function chunkText(
  text: string,
  options: ChunkTextOptions = {},
): DocumentChunk[] {
  const maxChunkSize =
    options.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;

  const overlap = options.overlap ?? DEFAULT_OVERLAP;
  const pageNumber = options.pageNumber ?? null;

  if (
    maxChunkSize <= 0 ||
    overlap < 0 ||
    overlap >= maxChunkSize
  ) {
    throw new Error("Invalid chunk size or overlap");
  }

  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalizedText) return [];

  const sections = splitIntoSections(normalizedText);
  const chunks: DocumentChunk[] = [];

  for (const section of sections) {
    const sectionChunks = splitLongSection(
      section,
      maxChunkSize,
      overlap,
    );

    for (const content of sectionChunks) {
      if (!content.trim()) continue;

      chunks.push({
        content: content.trim(),
        pageNumber,
      });
    }
  }

  return chunks;
}
