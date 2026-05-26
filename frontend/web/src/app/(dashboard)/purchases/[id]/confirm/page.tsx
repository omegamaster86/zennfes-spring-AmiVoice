import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPaymentMethods } from "../../../payment-methods/_apis/payment-method.server";
import { getPurchaseItem } from "../../_apis/purchase.server";
import { PurchaseConfirmForm } from "./_components/PurchaseConfirmForm";

/**
 * 購入確認ページ
 *
 * URL: /purchases/[id]/confirm
 *
 * - 商品の存在確認 + 金額表示
 * - 支払い方法選択
 * - 確定で 1 回課金実行
 */
export default async function PurchaseConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [item, paymentMethods] = await Promise.all([
    getPurchaseItem(id),
    getPaymentMethods(),
  ]);

  if (item === null) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">購入確認</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            内容をご確認のうえ、お支払いに進んでください。
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/purchases">← 戻る</Link>
        </Button>
      </div>

      <PurchaseConfirmForm item={item} paymentMethods={paymentMethods ?? []} />
    </div>
  );
}
