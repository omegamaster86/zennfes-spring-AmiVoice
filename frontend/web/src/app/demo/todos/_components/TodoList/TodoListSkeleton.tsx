/**
 * ToDoリストのスケルトン（ローディング中の表示）
 */
export function TodoListSkeleton() {
  // スケルトン用の固定ID配列
  const skeletonIds = ["skeleton-1", "skeleton-2", "skeleton-3"];

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
      </div>
      <div className="divide-y divide-gray-200">
        {skeletonIds.map((id) => (
          <div key={id} className="p-6">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="h-5 w-48 animate-pulse rounded bg-gray-200"></div>
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200"></div>
                <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200"></div>
              </div>
              <div className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
