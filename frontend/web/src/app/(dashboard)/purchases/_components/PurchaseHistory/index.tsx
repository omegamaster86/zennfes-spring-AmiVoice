import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/services/stripe/format";
import type { PurchaseStatus } from "@/types/stripe-schemas";
import { getPurchases } from "../../_apis/purchase.server";

const STATUS_LABEL: Record<
  PurchaseStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  succeeded: { label: "完了", variant: "default" },
  pending: { label: "処理中", variant: "secondary" },
  requires_action: { label: "追加認証要求", variant: "outline" },
  failed: { label: "失敗", variant: "destructive" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * 購入履歴（Server Component）
 */
export async function PurchaseHistory() {
  const purchases = await getPurchases();

  if (purchases === null || purchases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        購入履歴はまだありません。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {purchases.map((p) => {
        const status = STATUS_LABEL[p.status];
        return (
          <li
            key={p.id}
            className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">{p.itemName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(p.succeededAt ?? p.createdAt)}
              </p>
              {p.status === "failed" && p.failureReason && (
                <p className="mt-1 text-xs text-destructive">
                  {p.failureReason}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={status.variant}>{status.label}</Badge>
              <p className="font-semibold text-foreground">
                {formatCurrency(p.amount, p.currency)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
