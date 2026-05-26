import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/services/stripe/format";
import {
  getCurrentSubscription,
  getSubscriptionPlans,
} from "../../_apis/subscription.server";

const BILLING_INTERVAL_LABEL = {
  month: "月額",
  year: "年額",
} as const;

/**
 * サブスクリプションプラン一覧（Server Component）
 */
export async function PlanList() {
  const [plans, current] = await Promise.all([
    getSubscriptionPlans(),
    getCurrentSubscription(),
  ]);

  if (plans === null) {
    return (
      <div
        className="rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive"
        role="alert"
      >
        プランの取得に失敗しました。時間をおいて再度お試しください。
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <Sparkles
          className="mx-auto h-10 w-10 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-4 text-sm text-muted-foreground">
          現在ご利用いただけるプランはありません。
        </p>
      </div>
    );
  }

  // 既存契約あり（解約予約なし）の場合は加入ボタンを抑止する
  const hasActiveSubscription =
    current !== null &&
    (current.status === "active" ||
      current.status === "trialing" ||
      current.status === "past_due" ||
      current.status === "incomplete") &&
    !current.cancelAtPeriodEnd;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = current?.planId === plan.id;
        return (
          <li
            key={plan.id}
            className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {plan.name}
              </h3>
              {isCurrent && <Badge variant="default">ご利用中</Badge>}
            </div>
            {plan.description && (
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {plan.description}
              </p>
            )}
            <p className="mt-4 text-2xl font-bold text-foreground">
              {formatCurrency(plan.amount, plan.currency)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {BILLING_INTERVAL_LABEL[plan.billingInterval]}
              </span>
            </p>
            <div className="mt-4 flex justify-end">
              {isCurrent ? (
                <Button variant="outline" disabled>
                  現在のプラン
                </Button>
              ) : hasActiveSubscription ? (
                <Button variant="outline" disabled>
                  加入中
                </Button>
              ) : (
                <Button asChild>
                  <Link href={`/subscriptions/${plan.id}/subscribe`}>
                    加入する
                  </Link>
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
