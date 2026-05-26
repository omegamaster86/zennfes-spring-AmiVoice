// ========================================
// Edge Function: get-purchases
// 認証ユーザーの購入履歴を取得（最新順）
// ========================================

import { handler } from "../_shared/handler.ts";

interface PurchaseRpcRow {
  id: string;
  item_name: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "requires_action";
  failure_reason: string | null;
  succeeded_at: string | null;
  created_at: string;
}

Deno.serve(
  handler(
    async (_req, ctx) => {
      const data = await ctx.callRpc("sel_purchases_by_user", {
        p_auth_user_id: ctx.authUserId,
        p_limit: 50,
      });

      const list = ((data as PurchaseRpcRow[]) ?? []).map((r) => ({
        id: r.id,
        itemName: r.item_name,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        failureReason: r.failure_reason,
        succeededAt: r.succeeded_at,
        createdAt: r.created_at,
      }));

      return ctx.success(list);
    },
    { methods: ["GET"] },
  ),
);
