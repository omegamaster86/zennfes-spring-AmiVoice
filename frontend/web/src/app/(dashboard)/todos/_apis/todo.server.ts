"use server";

import { handler } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import type { TodoApi } from "@/types";
import { TodoSchema } from "@/types";

/**
 * ユーザーのToDo一覧を取得
 * サーバーサイドでEdge Functionを呼び出してToDo一覧を取得する
 * 認証トークンからユーザーを識別するため、userIdパラメータは不要
 *
 * @returns ToDo配列またはnull
 */
export async function getTodos(): Promise<TodoApi[] | null> {
  return handler(
    "getTodos",
    async (logger) => {
      const data = await callEdgeFunction("get-todos", TodoSchema.array(), {
        method: "GET",
        logger,
      });
      logger.info("todos_fetched", { recordCount: data.length });
      return data;
    },
    { onError: () => null },
  );
}
