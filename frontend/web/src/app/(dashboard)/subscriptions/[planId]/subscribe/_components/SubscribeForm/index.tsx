"use client";

import { CheckCircle2, CreditCard, ShieldAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCardBrand,
  formatCurrency,
  formatExpiry,
} from "@/services/stripe/format";
import type { PaymentMethod, SubscriptionPlan } from "@/types/stripe-schemas";
import { type SubscribeState, subscribe } from "../../_actions/subscribe";

const initialState: SubscribeState = { success: false, message: "" };

const BILLING_INTERVAL_LABEL = {
  month: "月額",
  year: "年額",
} as const;

/**
 * サブスクリプション加入フォーム
 *
 * - プラン概要（金額の真実値はサーバー側で再取得されるが、ここでは表示用）
 * - 支払い方法選択（既定はデフォルトの PaymentMethod）
 * - 加入実行ボタン
 */
export function SubscribeForm({
  plan,
  paymentMethods,
}: {
  plan: SubscriptionPlan;
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(subscribe, initialState);

  const defaultPm =
    paymentMethods.find((pm) => pm.isDefault) ?? paymentMethods[0] ?? null;
  const [selectedPmId, setSelectedPmId] = useState<string>(
    defaultPm?.stripePaymentMethodId ?? "",
  );

  useEffect(() => {
    if (state.message === "") return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  // 加入成功後はサブスクリプション一覧へ遷移
  useEffect(() => {
    if (
      state.success &&
      state.result &&
      (state.result.status === "active" || state.result.status === "trialing")
    ) {
      const timer = setTimeout(() => router.push("/subscriptions"), 1500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  if (paymentMethods.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-6 text-center">
        <CreditCard
          className="mx-auto h-10 w-10 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-3 text-sm text-muted-foreground">
          サブスクリプション加入には支払い方法の登録が必要です。
        </p>
        <Button asChild className="mt-4">
          <Link href="/payment-methods/add">カードを追加する</Link>
        </Button>
      </div>
    );
  }

  // 加入成功画面
  if (
    state.success &&
    state.result &&
    (state.result.status === "active" || state.result.status === "trialing")
  ) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <CheckCircle2
          className="mx-auto h-12 w-12 text-emerald-500"
          aria-hidden
        />
        <h3 className="mt-4 text-xl font-semibold text-foreground">
          ご加入ありがとうございました
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {state.result.planName} のご利用を開始しました。
        </p>
        <p className="mt-1 text-2xl font-bold text-foreground">
          {formatCurrency(state.result.amount, state.result.currency)}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/subscriptions">契約状況を見る</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="planId" value={plan.id} />
      <input type="hidden" name="stripePaymentMethodId" value={selectedPmId} />

      {/* 追加認証要求時のメッセージ */}
      {!state.success && state.result?.requiresAction && (
        <div
          className="flex items-start gap-3 rounded-md bg-amber-500/15 p-4 text-sm text-amber-700 dark:text-amber-300"
          role="alert"
          aria-live="polite"
        >
          <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">追加認証が必要です</p>
            <p className="mt-1">
              ご利用のカードで 3D セキュア等の本人確認が必要なため、お手数ですが
              支払い方法を変更するか、しばらく時間をおいて再度お試しください。
            </p>
          </div>
        </div>
      )}

      {/* 失敗時のメッセージ */}
      {!state.success && state.message && !state.result?.requiresAction && (
        <div
          className="flex items-start gap-3 rounded-md bg-destructive/15 p-4 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <XCircle className="h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">ご加入手続きに失敗しました</p>
            <p className="mt-1">{state.message}</p>
          </div>
        </div>
      )}

      {/* プランサマリ */}
      <section className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">プラン</p>
        <p className="mt-1 text-lg font-semibold text-foreground">
          {plan.name}
        </p>
        {plan.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {plan.description}
          </p>
        )}
        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">
            {BILLING_INTERVAL_LABEL[plan.billingInterval]}
          </span>
          <span className="text-3xl font-bold text-foreground">
            {formatCurrency(plan.amount, plan.currency)}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          ご加入後、次回更新日（
          {plan.billingInterval === "month" ? "1 か月" : "1 年"}
          後）に自動更新されます。期末キャンセルはいつでも可能です。
        </p>
      </section>

      {/* 支払い方法選択 */}
      <section className="rounded-lg border border-border bg-card p-6">
        <p className="mb-3 text-sm font-medium text-foreground">支払い方法</p>
        <Select
          value={selectedPmId}
          onValueChange={(v) => setSelectedPmId(v)}
          disabled={pending}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="支払い方法を選択" />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((pm) => {
              const brand = formatCardBrand(pm.cardBrand);
              const expiry = formatExpiry(pm.cardExpMonth, pm.cardExpYear);
              return (
                <SelectItem key={pm.id} value={pm.stripePaymentMethodId}>
                  {brand} •••• {pm.cardLast4 ?? "----"}
                  {expiry && ` (${expiry})`}
                  {pm.isDefault && " ★"}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <div className="mt-3 text-right">
          <Button asChild variant="link" size="sm">
            <Link href="/payment-methods/add">＋ 別のカードを追加</Link>
          </Button>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/subscriptions")}
          disabled={pending}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={pending || !selectedPmId}>
          {pending
            ? "処理中..."
            : `${formatCurrency(plan.amount, plan.currency)} で加入する`}
        </Button>
      </div>
    </form>
  );
}
