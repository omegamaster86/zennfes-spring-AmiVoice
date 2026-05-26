// ========================================
// Edge Function: get-payment-methods
// 認証ユーザーが登録している Stripe 支払い方法（非機密情報）一覧を取得
// ========================================

import { handler } from "../_shared/handler.ts";

interface PaymentMethodRpcRow {
  id: string;
  stripe_payment_method_id: string;
  is_default: boolean;
  type: string;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: string | null;
  card_exp_year: string | null;
  card_holder_name: string | null;
}

Deno.serve(
  handler(
    async (_req, ctx) => {
      const data = await ctx.callRpc("sel_stripe_payment_methods", {
        p_auth_user_id: ctx.authUserId,
      });

      const list = ((data as PaymentMethodRpcRow[]) ?? []).map((r) => ({
        id: r.id,
        stripePaymentMethodId: r.stripe_payment_method_id,
        isDefault: Boolean(r.is_default),
        type: r.type,
        cardBrand: r.card_brand,
        cardLast4: r.card_last4,
        cardExpMonth: r.card_exp_month,
        cardExpYear: r.card_exp_year,
        cardHolderName: r.card_holder_name,
      }));

      return ctx.success(list);
    },
    { methods: ["GET"] },
  ),
);
