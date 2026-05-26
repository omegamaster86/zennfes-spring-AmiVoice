import type { z } from "zod";
import type { PostalCodeSearchAddressSchema } from "./schema";

export type PostalCodeSearchAddress = z.infer<
  typeof PostalCodeSearchAddressSchema
>;

/**
 * 郵便番号検索のアクション戻り値型
 */
export type SearchPostalCodeResult =
  | { success: true; data: PostalCodeSearchAddress }
  | { success: false; notFound: boolean };
