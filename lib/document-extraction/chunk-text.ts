
export type DocumentChunk = {
  content: string;
  pageNumber: number | null;
};

type ChunkTextOptions = {
  maxChunkSize?: number;
  overlap?: number;
  pageNumber?: number | null;
};

const DEFAULT_MAX_CHUNK_SIZE = 2800;
const DEFAULT_OVERLAP = 400;

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

  const normalizedText = text.trim();

  if (!normalizedText) return [];

  const chunks: DocumentChunk[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    let end = Math.min(start + maxChunkSize, normalizedText.length);

    if (end < normalizedText.length) {
      const minimumBoundary = start + Math.floor(maxChunkSize * 0.6);

      // Prefer paragraph boundaries.
      let boundary = normalizedText.lastIndexOf("\n\n", end);

      // Otherwise prefer sentence boundaries.
      if (boundary < minimumBoundary) {
        const sentenceMatches = [
          ...normalizedText.slice(minimumBoundary, end).matchAll(/[.!?]\s/g),
        ];

        boundary =
          sentenceMatches.length > 0
            ? minimumBoundary +
              sentenceMatches[sentenceMatches.length - 1].index! +
              1
            : -1;
      }

      // Otherwise use a word boundary.
      if (boundary < minimumBoundary) {
        boundary = normalizedText.lastIndexOf(" ", end);
      }

      if (boundary >= minimumBoundary) {
        end = boundary;
      }
    }

    const content = normalizedText.slice(start, end).trim();

    if (content) {
      chunks.push({
        content,
        pageNumber,
      });
    }

    if (end >= normalizedText.length) break;

    // Move backwards to create overlap.
    start = Math.max(start + 1, end - overlap);
  }

  return chunks;
}
