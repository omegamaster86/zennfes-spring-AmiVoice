import { Suspense } from "react";
import { CurrentSubscriptionCard } from "./_components/CurrentSubscriptionCard";
import { PlanList } from "./_components/PlanList";

/**
 * サブスクリプションページ
 * 現在の契約状態とプラン一覧を表示する
 */
export default function SubscriptionsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            サブスクリプション
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            現在のご契約状況と、お選びいただけるプランを表示しています。
          </p>
        </div>
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          }
        >
          <CurrentSubscriptionCard />
        </Suspense>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-foreground">プラン</h3>
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          }
        >
          <PlanList />
        </Suspense>
      </section>
    </div>
  );
}
