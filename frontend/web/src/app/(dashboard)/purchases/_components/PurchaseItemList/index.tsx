import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/services/stripe/format";
import { getPurchaseItems } from "../../_apis/purchase.server";

/**
 * 購入可能アイテム一覧（Server Component）
 */
export async function PurchaseItemList() {
  const items = await getPurchaseItems();

  if (items === null) {
    return (
      <div
        className="rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive"
        role="alert"
      >
        購入アイテムの取得に失敗しました。時間をおいて再度お試しください。
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <ShoppingBag
          className="mx-auto h-10 w-10 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-4 text-sm text-muted-foreground">
          現在販売中のアイテムはありません。
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
          {item.description && (
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}
          <p className="mt-4 text-2xl font-bold text-foreground">
            {formatCurrency(item.amount, item.currency)}
          </p>
          <div className="mt-4 flex justify-end">
            <Button asChild>
              <Link href={`/purchases/${item.id}/confirm`}>購入する</Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
