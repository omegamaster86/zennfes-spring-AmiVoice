import { z } from "npm:zod";

export const saveFileRecordSchema = z.object({
  bucket: z.string().min(1, "bucket is required"),
  storagePath: z.string().min(1, "storagePath is required"),
  fileName: z.string().min(1, "fileName is required"),
  originalName: z.string().min(1, "originalName is required"),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().nullish(),
  url: z.string().min(1, "url is required"),
});

export type SaveFileRecordRequest = z.infer<typeof saveFileRecordSchema>;

export interface SaveFileRecordResponse {
  id: string;
  bucket: string;
  storagePath: string;
  fileName: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string | null;
  url: string;
}
