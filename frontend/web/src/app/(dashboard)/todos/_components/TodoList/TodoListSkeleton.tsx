/**
 * ToDoリストのスケルトンローディング
 * データ取得中に表示されるプレースホルダー
 */
export function TodoListSkeleton() {
  return (
    <div className="rounded-lg bg-card shadow">
      <div className="border-b border-border px-6 py-4">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-64 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
