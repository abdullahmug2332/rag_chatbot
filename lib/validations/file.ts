const FILE_SIGNATURES = {
  pdf: Buffer.from("%PDF"),
  docx: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
};

export function validateFileSignature(
  buffer: Buffer,
  fileType: string
): boolean {
  if (fileType === "application/pdf") {
    return buffer.subarray(0, 4).equals(FILE_SIGNATURES.pdf);
  }

  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return buffer.subarray(0, 4).equals(FILE_SIGNATURES.docx);
  }

  if (fileType === "text/plain") {
    // Reject empty files and files containing null bytes.
    return (
      buffer.length > 0 &&
      !buffer.includes(0)
    );
  }

  return false;
}