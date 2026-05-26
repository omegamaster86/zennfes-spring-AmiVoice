import type { MockTodo } from "@/types/demo-types";
import { createMockStore, resetMockStore } from "../index";

/**
 * TODOストアの型定義
 */
type TodoStoreData = {
  todos: MockTodo[];
  nextId: number;
};

/**
 * 初期データ
 */
const initialTodoData: TodoStoreData = {
  todos: [
    {
      id: 1,
      title: "デモアプリの企画書を作成",
      description: "プロジェクトの概要と技術スタックをまとめる",
      priority: "high",
      status: "in_progress",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 2,
      title: "モックデータの実装",
      description: "Server Actionsでメモリ内にデータを保持する仕組みを実装",
      priority: "medium",
      status: "completed",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 3,
      title: "UI/UXの改善",
      description: null,
      priority: "low",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ],
  nextId: 4,
};

/**
 * TODOストアを取得
 * グローバルストアから取得し、存在しない場合は初期化
 */
function getTodoStore(): TodoStoreData {
  return createMockStore<TodoStoreData>("demo:todos", initialTodoData);
}

// ============================================
// データストアアクセス関数
// ============================================

/**
 * モックTODOリストを取得
 *
 * @returns TODO配列
 */
export function getMockTodos(): MockTodo[] {
  return getTodoStore().todos;
}

/**
 * モックTODOリストを設定
 *
 * @param todos 設定するTODO配列
 */
export function setMockTodos(todos: MockTodo[]): void {
  getTodoStore().todos = todos;
}

/**
 * TODOを追加
 *
 * @param todo 追加するTODO
 */
export function addMockTodo(todo: MockTodo): void {
  const store = getTodoStore();
  store.todos.push(todo);
  console.log("[MOCK TODO] ToDo追加成功:", store.todos.length, "件");
}

/**
 * TODOを削除
 *
 * @param id 削除するTODOのID
 * @returns 削除されたTODO、見つからない場合はnull
 */
export function removeMockTodo(id: number): MockTodo | null {
  const store = getTodoStore();
  const index = store.todos.findIndex((todo) => todo.id === id);
  if (index === -1) {
    return null;
  }
  return store.todos.splice(index, 1)[0];
}

/**
 * TODOを更新
 *
 * @param id 更新するTODOのID
 * @param updates 更新内容
 * @returns 更新されたTODO、見つからない場合はnull
 */
export function updateMockTodo(
  id: number,
  updates: Partial<Omit<MockTodo, "id" | "createdAt">>,
): MockTodo | null {
  const store = getTodoStore();
  const index = store.todos.findIndex((todo) => todo.id === id);
  if (index === -1) {
    return null;
  }
  store.todos[index] = { ...store.todos[index], ...updates };
  return store.todos[index];
}

/**
 * 次のIDを取得
 *
 * @returns 次のID
 */
export function getNextTodoId(): number {
  return getTodoStore().nextId;
}

/**
 * 次のIDをインクリメントして取得
 *
 * @returns インクリメント後のID
 */
export function getNextTodoIdAndIncrement(): number {
  const store = getTodoStore();
  return store.nextId++;
}

/**
 * 次のIDを設定
 *
 * @param id 設定するID
 */
export function setNextTodoId(id: number): void {
  getTodoStore().nextId = id;
}

/**
 * TODOストアをリセット
 */
export function resetTodoStore(): void {
  resetMockStore("demo:todos", initialTodoData);
}
