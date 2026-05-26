import { Suspense } from "react";
import { PurchaseHistory } from "./_components/PurchaseHistory";
import { PurchaseItemList } from "./_components/PurchaseItemList";

/**
 * 購入ページ
 * 販売中アイテムの一覧と購入履歴を表示する
 */
export default function PurchasesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">購入</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ご希望のアイテムを選んで購入できます。
          </p>
        </div>
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          }
        >
          <PurchaseItemList />
        </Suspense>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-foreground">購入履歴</h3>
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          }
        >
          <PurchaseHistory />
        </Suspense>
      </section>
    </div>
  );
}
