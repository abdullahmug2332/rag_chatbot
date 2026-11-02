import { z } from "zod";

export const createDocumentSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.number().positive("File size must be greater than zero"),
});

export const deleteDocumentSchema = z.object({
  id: z.string().uuid("Invalid document ID"),
});