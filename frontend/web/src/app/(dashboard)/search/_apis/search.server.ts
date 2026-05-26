"use server";

import { handler } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import type { TodoSearchResult } from "@/types";
import { TodoSearchResultSchema } from "@/types";

/**
 * ToDoをキーワードで全文検索する
 * Edge Function `search-todos` を呼び出し、pgroonga + LIKE フォールバックの検索結果を取得する
 *
 * 検索文字列は空白区切りで複数キーワード AND 検索になり、
 * `"…"` で囲むとフレーズとして扱われる（例: `北海道 札幌 "Next js"`）。
 *
 * @param keyword 検索文字列（trim 後 1 文字以上）
 * @param limit 取得件数（既定 20, 最大 50）
 * @param offset オフセット（既定 0）
 * @returns ToDo配列またはnull（失敗時）
 */
export async function searchTodos(
  keyword: string,
  limit = 20,
  offset = 0,
): Promise<TodoSearchResult[] | null> {
  const q = keyword.trim();
  if (q.length === 0) {
    return [];
  }

  return handler(
    "searchTodos",
    async (logger) => {
      const params = new URLSearchParams({
        q,
        limit: String(limit),
        offset: String(offset),
      });
      const data = await callEdgeFunction(
        `search-todos?${params.toString()}`,
        TodoSearchResultSchema.array(),
        {
          method: "GET",
          logger,
        },
      );
      logger.info("todos_searched", {
        keyword: q,
        recordCount: data.length,
      });
      return data;
    },
    { onError: () => null },
  );
}
