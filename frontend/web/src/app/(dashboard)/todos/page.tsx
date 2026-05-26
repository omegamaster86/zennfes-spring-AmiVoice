import Link from "next/link";
import { Suspense } from "react";
import { TodoList } from "./_components/TodoList";
import { TodoListSkeleton } from "./_components/TodoList/TodoListSkeleton";

/**
 * ToDosページ
 * 認証済みユーザーのToDo管理画面
 */
export default async function TodosPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">ToDo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          あなたのToDo一覧を管理します。
        </p>
      </div>

      <div className="mt-8">
        <div className="mb-6 flex justify-end">
          <Link
            href="/todos/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            新しいToDoを作成
          </Link>
        </div>
        <Suspense fallback={<TodoListSkeleton />}>
          <TodoList />
        </Suspense>
      </div>
    </div>
  );
}
