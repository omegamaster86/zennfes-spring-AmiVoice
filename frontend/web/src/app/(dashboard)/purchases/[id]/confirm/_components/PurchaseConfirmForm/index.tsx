"use client";

import { CheckCircle2, CreditCard, XCircle } from "lucide-react";
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
import type { PaymentMethod, PurchaseItem } from "@/types/stripe-schemas";
import {
  type ConfirmPurchaseState,
  confirmPurchase,
} from "../../_actions/confirm-purchase";

const initialState: ConfirmPurchaseState = { success: false, message: "" };

/**
 * 購入確認フォーム
 *
 * - 商品概要（金額の真実値はサーバー側で再取得されるが、ここでは表示用）
 * - 支払い方法選択（既定はデフォルトの PaymentMethod）
 * - 購入実行ボタン
 */
export function PurchaseConfirmForm({
  item,
  paymentMethods,
}: {
  item: PurchaseItem;
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    confirmPurchase,
    initialState,
  );

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

  // 課金成功後は履歴ページへ
  useEffect(() => {
    if (state.success && state.result?.status === "succeeded") {
      const timer = setTimeout(() => router.push("/purchases"), 1500);
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
          購入には支払い方法の登録が必要です。
        </p>
        <Button asChild className="mt-4">
          <Link href="/payment-methods/add">カードを追加する</Link>
        </Button>
      </div>
    );
  }

  // 課金成功画面
  if (state.success && state.result?.status === "succeeded") {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <CheckCircle2
          className="mx-auto h-12 w-12 text-emerald-500"
          aria-hidden
        />
        <h3 className="mt-4 text-xl font-semibold text-foreground">
          ご購入ありがとうございました
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {state.result.itemName} のお支払いが完了しました。
        </p>
        <p className="mt-1 text-2xl font-bold text-foreground">
          {formatCurrency(state.result.amount, state.result.currency)}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/purchases">購入履歴を見る</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="purchaseItemId" value={item.id} />
      <input type="hidden" name="stripePaymentMethodId" value={selectedPmId} />

      {/* 失敗時のメッセージ */}
      {!state.success && state.message && (
        <div
          className="flex items-start gap-3 rounded-md bg-destructive/15 p-4 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <XCircle className="h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">お支払いに失敗しました</p>
            <p className="mt-1">{state.message}</p>
          </div>
        </div>
      )}

      {/* 商品サマリ */}
      <section className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">商品</p>
        <p className="mt-1 text-lg font-semibold text-foreground">
          {item.name}
        </p>
        {item.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">合計</span>
          <span className="text-3xl font-bold text-foreground">
            {formatCurrency(item.amount, item.currency)}
          </span>
        </div>
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
          onClick={() => router.push("/purchases")}
          disabled={pending}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={pending || !selectedPmId}>
          {pending
            ? "処理中..."
            : `${formatCurrency(item.amount, item.currency)} を支払う`}
        </Button>
      </div>
    </form>
  );
}
