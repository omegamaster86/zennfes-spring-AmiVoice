import { z } from "npm:zod";

export const deleteFileRecordSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export type DeleteFileRecordRequest = z.infer<typeof deleteFileRecordSchema>;

export interface DeleteFileRecordResponse {
  id: string;
  bucket: string;
  storagePath: string;
  originalName: string;
}
