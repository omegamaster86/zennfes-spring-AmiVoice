"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerPaymentMethod } from "../../_actions/register-payment-method";

/**
 * Stripe Elements を使ったカード入力フォーム本体
 *
 * フロー:
 *   1. stripe.confirmSetup({ redirect: "if_required" }) で SetupIntent を確定
 *   2. setupIntent.payment_method を取り出して Server Action へ渡す
 *   3. Server Action 内で create-payment-method Edge Function を呼ぶ
 *   4. 成功 → /payment-methods へ遷移
 */
export function CardForm({ setupIntentId }: { setupIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [cardHolderName, setCardHolderName] = useState("");
  const [setDefault, setSetDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // ── 1. SetupIntent を確定 ──
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          // 3DS が必要な場合に同一ページへ戻すため return_url を指定
          return_url: `${window.location.origin}/payment-methods/add`,
          payment_method_data: cardHolderName
            ? { billing_details: { name: cardHolderName } }
            : undefined,
        },
        redirect: "if_required",
      });

      if (error) {
        const message =
          error.type === "validation_error" || error.type === "card_error"
            ? (error.message ?? "カード情報を確認してください")
            : "カードの確認に失敗しました";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      if (!setupIntent || setupIntent.status !== "succeeded") {
        const message = "カードの確認が完了しませんでした";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      const stripePaymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : (setupIntent.payment_method?.id ?? null);

      if (!stripePaymentMethodId) {
        const message = "支払い方法 ID が取得できませんでした";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      // ── 2. Server Action でDB登録 ──
      const result = await registerPaymentMethod({
        stripePaymentMethodId,
        cardHolderName: cardHolderName.trim() || null,
        setDefault,
      });

      if (!result.success) {
        setErrorMessage(result.message);
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push("/payment-methods");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "予期しないエラーが発生しました";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" value={setupIntentId} readOnly aria-hidden />

      {errorMessage && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cardHolderName">カード名義（任意）</Label>
        <Input
          id="cardHolderName"
          name="cardHolderName"
          type="text"
          placeholder="TARO YAMADA"
          autoComplete="cc-name"
          value={cardHolderName}
          onChange={(e) => setCardHolderName(e.target.value)}
          disabled={submitting}
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label>カード情報</Label>
        <div className="rounded-md border border-input bg-background p-4">
          <PaymentElement
            options={{
              layout: { type: "tabs", defaultCollapsed: false },
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          カード情報は Stripe に直接送信され、当サーバーには保存されません。
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="setDefault"
          checked={setDefault}
          onCheckedChange={(checked) => setSetDefault(checked === true)}
          disabled={submitting}
        />
        <Label
          htmlFor="setDefault"
          className="cursor-pointer text-sm font-normal"
        >
          このカードをデフォルトの支払い方法に設定する
        </Label>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/payment-methods")}
          disabled={submitting}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={!stripe || !elements || submitting}>
          {submitting ? "登録中..." : "カードを登録"}
        </Button>
      </div>
    </form>
  );
}
