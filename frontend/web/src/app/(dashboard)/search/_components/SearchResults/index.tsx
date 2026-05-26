import { searchTodos } from "../../_apis/search.server";

type SearchResultsProps = {
  keyword: string;
};

/**
 * 検索結果（Server Component）
 * searchTodos を呼び出して pgroonga 検索結果を表示する
 */
export async function SearchResults({ keyword }: SearchResultsProps) {
  const q = keyword.trim();

  if (q.length === 0) {
    return (
      <div className="rounded-lg bg-card p-6 text-center text-muted-foreground shadow">
        キーワードを入力して検索してください。
      </div>
    );
  }

  const results = await searchTodos(q);

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-muted text-muted-foreground";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  }

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

  if (results === null) {
    return (
      <div className="rounded-lg bg-card p-6 text-center text-destructive shadow">
        検索中にエラーが発生しました。時間をおいて再度お試しください。
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card shadow">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-foreground">
          検索結果 ({results.length}件)
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          キーワード: <span className="font-medium text-foreground">{q}</span>
        </p>
      </div>
      <div className="divide-y divide-border">
        {results.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            一致するToDoは見つかりませんでした。
          </div>
        ) : (
          results.map((todo) => (
            <div
              key={todo.id}
              className="p-6 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-medium text-foreground">
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
                    <p className="mt-2 text-sm text-muted-foreground">
                      {todo.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
