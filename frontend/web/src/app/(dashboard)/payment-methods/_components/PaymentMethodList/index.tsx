import { CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPaymentMethods } from "../../_apis/payment-method.server";
import { PaymentMethodCard } from "./PaymentMethodCard";

/**
 * 支払い方法一覧（Server Component）
 *
 * Edge Function から最新の支払い方法を取得して描画する。
 * 個々のカードはアクション可能な Client Component として展開する。
 */
export async function PaymentMethodList() {
  const paymentMethods = await getPaymentMethods();

  if (paymentMethods === null) {
    return (
      <div
        className="rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive"
        role="alert"
      >
        支払い方法の取得に失敗しました。時間をおいて再度お試しください。
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <CreditCard
          className="mx-auto h-10 w-10 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-4 text-sm text-muted-foreground">
          まだ支払い方法が登録されていません。
        </p>
        <Button asChild className="mt-6">
          <Link href="/payment-methods/add">カードを追加する</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {paymentMethods.map((pm) => (
        <li key={pm.id}>
          <PaymentMethodCard paymentMethod={pm} />
        </li>
      ))}
    </ul>
  );
}
