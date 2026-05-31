import { z } from "zod";

export const ConfirmLanguageSchema = z.object({
  recognizedText: z.string().min(1),
  language: z.enum(["en", "ja"]),
  inputSource: z.enum(["mic", "file"]),
  amivoiceUtteranceId: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const RecordIdParamsSchema = z.object({
  id: z.string().uuid(),
});
