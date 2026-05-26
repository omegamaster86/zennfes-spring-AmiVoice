/**
 * 支払い方法一覧の Suspense フォールバック
 */
export function PaymentMethodListSkeleton() {
  return (
    <ul
      className="space-y-3"
      aria-busy="true"
      aria-label="支払い方法を読み込み中"
    >
      {[0, 1].map((i) => (
        <li
          key={i}
          className="flex h-24 animate-pulse items-center gap-4 rounded-lg border border-border bg-card p-5"
        >
          <div className="h-12 w-12 rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 rounded bg-muted" />
            <div className="h-3 w-1/3 rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
