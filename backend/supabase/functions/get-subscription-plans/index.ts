// ========================================
// Edge Function: get-subscription-plans
// 認証ユーザー向けに販売中のサブスクリプションプラン一覧を取得
// ========================================

import { handler } from "../_shared/handler.ts";

interface SubscriptionPlanRpcRow {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id: string;
  amount: number;
  currency: string;
  billing_interval: "month" | "year";
  display_order: number;
}

Deno.serve(
  handler(
    async (_req, ctx) => {
      const data = await ctx.callRpc("sel_subscription_plans", {});

      const list = ((data as SubscriptionPlanRpcRow[]) ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        stripePriceId: p.stripe_price_id,
        amount: p.amount,
        currency: p.currency,
        billingInterval: p.billing_interval,
        displayOrder: p.display_order,
      }));

      return ctx.success(list);
    },
    { methods: ["GET"] },
  ),
);
