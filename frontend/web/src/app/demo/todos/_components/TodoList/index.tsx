import { Info } from "lucide-react";
import { getTodosMock } from "../../_apis/todo-mock.server";

/**
 * ToDoリスト コンポーネント（Server Component）
 * モックデータからToDo一覧を取得して表示する
 */
export async function TodoList() {
  // モックToDoリストを取得
  const todos = await getTodosMock();

  /**
   * 優先度のバッジカラーを取得
   */
  function getPriorityColor(priority: string) {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  /**
   * ステータスのバッジカラーを取得
   */
  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  /**
   * ステータスの日本語表記を取得
   */
  function getStatusLabel(status: string) {
    switch (status) {
      case "completed":
        return "完了";
      case "in_progress":
        return "進行中";
      case "pending":
        return "未着手";
      case "cancelled":
        return "キャンセル";
      default:
        return status;
    }
  }

  /**
   * 優先度の日本語表記を取得
   */
  function getPriorityLabel(priority: string) {
    switch (priority) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return priority;
    }
  }

  return (
    <div>
      {/* デモ用の注意書き */}
      <div className="mb-4 rounded-md bg-blue-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>デモモード：</strong>
              このページはモックデータを使用しています。データはサーバーのメモリ内に保持されるため、サーバー再起動時にリセットされます。
            </p>
          </div>
        </div>
      </div>

      {/* ToDoリスト */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            ToDoリスト（デモ） ({todos.length}件)
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {todos.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              ToDoがありません。新しいToDoを作成してください。
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="p-6 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-medium text-gray-900">
                        {todo.title}
                      </h4>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                          todo.status,
                        )}`}
                      >
                        {getStatusLabel(todo.status)}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPriorityColor(
                          todo.priority,
                        )}`}
                      >
                        優先度: {getPriorityLabel(todo.priority)}
                      </span>
                    </div>
                    {todo.description && (
                      <p className="mt-2 text-sm text-gray-600">
                        {todo.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      作成日時:{" "}
                      {new Date(todo.createdAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
