import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { PaymentMethodList } from "./_components/PaymentMethodList";
import { PaymentMethodListSkeleton } from "./_components/PaymentMethodList/PaymentMethodListSkeleton";

/**
 * 支払い方法管理ページ
 * 登録済みカードの一覧表示・デフォルト変更・削除を行う
 */
export default function PaymentMethodsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">支払い方法</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            登録済みのクレジットカードを管理します。
          </p>
        </div>
        <Button asChild>
          <Link href="/payment-methods/add">＋ カードを追加</Link>
        </Button>
      </div>

      <Suspense fallback={<PaymentMethodListSkeleton />}>
        <PaymentMethodList />
      </Suspense>
    </div>
  );
}
