"use server";

import { actionError, handler, success, validate } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import { TodoSchema } from "@/types";
import { CreateTodoFormSchema } from "./schema";
import type { CreateTodoState } from "./types";

export type { CreateTodoState } from "./types";

/**
 * 新しいToDoを作成（useActionState対応）
 * サーバーサイドでEdge Functionを呼び出してToDoを作成する
 * 認証トークンからユーザーを識別するため、userIdパラメータは不要
 *
 * @param _prevState 前回の状態（未使用）
 * @param formData フォームデータ
 * @returns 作成結果の状態
 */
export async function createTodo(
  _prevState: CreateTodoState,
  formData: FormData,
): Promise<CreateTodoState> {
  return handler(
    "createTodo",
    async (logger): Promise<CreateTodoState> => {
      const { title, description, priority } = validate(
        CreateTodoFormSchema,
        {
          title: formData.get("title"),
          description: formData.get("description") || null,
          priority: formData.get("priority"),
        },
        logger,
      );

      await callEdgeFunction("create-todo", TodoSchema, {
        method: "POST",
        body: {
          title: title.trim(),
          description: description?.trim() ?? null,
          priority,
          dueDate: null,
        },
        logger,
      });

      return success("ToDoを作成しました");
    },
    {
      startMeta: {
        title: formData.get("title"),
        priority: formData.get("priority"),
      },
      onError: (error): CreateTodoState => actionError(error, formData),
    },
  );
}
