import Link from "next/link";
import { Suspense } from "react";
import { TodoList } from "./_components/TodoList";
import { TodoListSkeleton } from "./_components/TodoList/TodoListSkeleton";

/**
 * デモToDosページ
 * モックデータを使用したToDo管理画面
 */
export default async function DemoTodosPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* メインコンテンツエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* コンテンツ */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            {/* ページヘッダー */}
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  ToDo（デモ）
                </h2>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  デモモード
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                モックデータを使用したToDo一覧を管理します。
              </p>
            </div>

            {/* ToDoリスト */}
            <div className="mt-8">
              {/* 新規作成ボタン */}
              <div className="mb-6 flex justify-end gap-3">
                <Link
                  href="/demo/todos/new"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  新しいToDoを作成
                </Link>
              </div>

              {/* Suspenseでラップ: データ取得中はローディング表示 */}
              <Suspense fallback={<TodoListSkeleton />}>
                <TodoList />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
