// ========================================
// Edge Function: get-purchase-items
// 販売中の購入アイテム一覧を取得
// ========================================

import { handler } from "../_shared/handler.ts";

interface PurchaseItemRpcRow {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  display_order: number;
}

Deno.serve(
  handler(
    async (_req, ctx) => {
      const data = await ctx.callRpc("sel_purchase_items", {});

      const list = ((data as PurchaseItemRpcRow[]) ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        amount: r.amount,
        currency: r.currency,
        displayOrder: r.display_order,
      }));

      return ctx.success(list);
    },
    { methods: ["GET"] },
  ),
);
