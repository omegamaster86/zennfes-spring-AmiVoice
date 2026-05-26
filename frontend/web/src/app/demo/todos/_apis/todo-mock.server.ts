"use server";

import { getMockTodos } from "@/services/mock-store/stores/todo";
import type { MockTodo } from "@/types/demo-types";

/**
 * すべてのToDoを取得
 *
 * @returns ToDo配列
 */
export async function getTodosMock(): Promise<MockTodo[]> {
  const mockTodos = getMockTodos();
  // 作成日時の降順でソート（新しい順）
  return [...mockTodos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
