"use client";

import { CreditCard, Star, Trash2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCardBrand, formatExpiry } from "@/services/stripe/format";
import type { PaymentMethod } from "@/types/stripe-schemas";
import {
  deletePaymentMethod,
  type PaymentMethodActionState,
  setDefaultPaymentMethod,
} from "../../_actions/payment-method";

const initialState: PaymentMethodActionState = { success: false, message: "" };

/**
 * 支払い方法 1 件を描画する Client Component
 *
 * - 「デフォルトに設定」「削除」を Server Action 経由で実行
 * - 成功 / 失敗トースト表示
 */
export function PaymentMethodCard({
  paymentMethod,
}: {
  paymentMethod: PaymentMethod;
}) {
  const [setDefaultState, setDefaultAction, setDefaultPending] = useActionState(
    setDefaultPaymentMethod,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePaymentMethod,
    initialState,
  );

  useEffect(() => {
    if (setDefaultState.message === "") return;
    if (setDefaultState.success) toast.success(setDefaultState.message);
    else toast.error(setDefaultState.message);
  }, [setDefaultState]);

  useEffect(() => {
    if (deleteState.message === "") return;
    if (deleteState.success) toast.success(deleteState.message);
    else toast.error(deleteState.message);
  }, [deleteState]);

  const brand = formatCardBrand(paymentMethod.cardBrand);
  const expiry = formatExpiry(
    paymentMethod.cardExpMonth,
    paymentMethod.cardExpYear,
  );
  const last4 = paymentMethod.cardLast4 ?? "----";

  const pending = setDefaultPending || deletePending;

  return (
    <article
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      aria-label={`${brand} カード（末尾 ${last4}）`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <CreditCard className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">
              {brand} •••• {last4}
            </p>
            {paymentMethod.isDefault && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3" aria-hidden />
                デフォルト
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {paymentMethod.cardHolderName ?? "名義未設定"}
            {expiry && <span className="ml-2">有効期限 {expiry}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {!paymentMethod.isDefault && (
          <form action={setDefaultAction}>
            <input
              type="hidden"
              name="stripePaymentMethodId"
              value={paymentMethod.stripePaymentMethodId}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={pending}
            >
              デフォルトに設定
            </Button>
          </form>
        )}
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!confirm("この支払い方法を削除しますか？")) {
              e.preventDefault();
            }
          }}
        >
          <input
            type="hidden"
            name="stripePaymentMethodId"
            value={paymentMethod.stripePaymentMethodId}
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-label="支払い方法を削除"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      </div>
    </article>
  );
}
