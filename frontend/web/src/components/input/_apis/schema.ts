import { z } from "zod";

/**
 * 郵便番号検索の住所データスキーマ
 */
export const PostalCodeSearchAddressSchema = z.object({
  prefecture: z.string(),
  city: z.string(),
  town: z.string(),
  block: z.string(),
  address: z.string(),
});

/**
 * 郵便番号検索の成功レスポンススキーマ
 */
export const PostalCodeSearchSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: PostalCodeSearchAddressSchema,
});
