import { z } from "npm:zod";

/**
 * search-todos Edge Function のクエリパラメータ
 *
 * - q: 検索キーワード文字列（空白区切りで複数指定すると AND 検索。`"…"` で囲むとフレーズ）
 *      例: `北海道 札幌 "Next js"`
 *      trim 後 1 文字以上 / 200 文字以内
 * - limit: 取得件数（既定 20, 最大 50）
 * - offset: オフセット（既定 0）
 */
export const searchTodosQuerySchema = z.object({
  q: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, "キーワードを入力してください").max(200)),
  limit: z
    .preprocess(
      (v) => (v === undefined || v === null || v === "" ? 20 : Number(v)),
      z.number().int().min(1).max(50),
    )
    .default(20),
  offset: z
    .preprocess(
      (v) => (v === undefined || v === null || v === "" ? 0 : Number(v)),
      z.number().int().min(0),
    )
    .default(0),
});

export type SearchTodosQuery = z.infer<typeof searchTodosQuerySchema>;

/** キーワード 1 つあたりの最大文字数 */
export const MAX_KEYWORD_LENGTH = 100;

/** キーワードの最大個数（AND 連結時の上限） */
export const MAX_KEYWORD_COUNT = 10;
