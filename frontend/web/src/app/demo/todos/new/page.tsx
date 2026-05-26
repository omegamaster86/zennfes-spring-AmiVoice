import { NewTodoForm } from "./_components/NewTodoForm";

/**
 * デモToDo新規作成ページ（Server Component）
 * モックデータを使用したToDo作成画面
 */
export default function DemoTodoNewPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* メインコンテンツエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* コンテンツ */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            {/* ページタイトル */}
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  新しいToDoを作成（デモ）
                </h2>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  デモモード
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                必要な情報を入力して新しいToDoを作成できます。
              </p>
            </div>

            {/* ToDo追加フォーム（Client Component） */}
            <div className="rounded-lg bg-white p-6 shadow">
              <NewTodoForm />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
