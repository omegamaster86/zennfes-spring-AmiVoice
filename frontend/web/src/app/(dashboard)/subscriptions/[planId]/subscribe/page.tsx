import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPaymentMethods } from "../../../payment-methods/_apis/payment-method.server";
import {
  getCurrentSubscription,
  getSubscriptionPlan,
} from "../../_apis/subscription.server";
import { SubscribeForm } from "./_components/SubscribeForm";

/**
 * サブスクリプション加入確認ページ
 *
 * URL: /subscriptions/[planId]/subscribe
 *
 * - プランの存在確認 + 金額表示
 * - 支払い方法選択
 * - 既存契約があれば一覧へリダイレクト（多重加入防止）
 * - 確定で加入実行
 */
export default async function SubscribeConfirmPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  const [plan, paymentMethods, current] = await Promise.all([
    getSubscriptionPlan(planId),
    getPaymentMethods(),
    getCurrentSubscription(),
  ]);

  if (plan === null) {
    notFound();
  }

  const hasActiveSubscription =
    current !== null &&
    (current.status === "active" ||
      current.status === "trialing" ||
      current.status === "past_due" ||
      current.status === "incomplete") &&
    !current.cancelAtPeriodEnd;

  if (hasActiveSubscription) {
    redirect("/subscriptions");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">加入確認</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            内容をご確認のうえ、加入手続きにお進みください。
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/subscriptions">← 戻る</Link>
        </Button>
      </div>

      <SubscribeForm plan={plan} paymentMethods={paymentMethods ?? []} />
    </div>
  );
}
