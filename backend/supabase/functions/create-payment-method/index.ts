// ========================================
// Edge Function: create-payment-method
// SetupIntent 完了後に、PaymentMethod を顧客に紐付け、
// 非機密情報を m_stripe_payment_method に登録する
// ========================================

import { handler } from "../_shared/handler.ts";
import {
  type CreatePaymentMethodResponse,
  createPaymentMethodSchema,
} from "../_shared/schemas/create-payment-method-schema.ts";
import {
  attachPaymentMethod,
  isStripeId,
  retrievePaymentMethod,
  updateCustomerDefaultPaymentMethod,
} from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface MUserRow {
  id: string;
  stripe_customer_id: string | null;
}

interface InsRpcRow {
  id: string;
  stripe_payment_method_id: string;
  is_default: boolean;
}

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(createPaymentMethodSchema);

    const adminClient = createAdminClient();
    const { data: mUser, error: mUserErr } = await adminClient
      .from("m_user")
      .select("id, stripe_customer_id")
      .eq("supabase_auth_user_id", ctx.authUserId)
      .is("deleted_at", null)
      .maybeSingle<MUserRow>();

    if (mUserErr) {
      return ctx.error(500, "DB_ERROR", mUserErr.message);
    }
    if (!mUser) {
      return ctx.error(404, "USER_NOT_FOUND", "ユーザーレコードが存在しません");
    }
    if (
      !mUser.stripe_customer_id ||
      !isStripeId(mUser.stripe_customer_id, "cus_")
    ) {
      return ctx.error(409, "NO_CUSTOMER", "Stripe Customer が未作成です");
    }

    // Stripe から PaymentMethod の詳細を取得（カード情報の真実値）
    const pm = await retrievePaymentMethod(ctx, {
      paymentMethodId: body.stripePaymentMethodId,
    });

    // 既に attach 済みなら attach はスキップ（idempotent）
    if (pm.customer !== mUser.stripe_customer_id) {
      try {
        await attachPaymentMethod(ctx, {
          paymentMethodId: body.stripePaymentMethodId,
          customerId: mUser.stripe_customer_id,
        });
      } catch (err) {
        // 既に他顧客に attach されていた場合などはエラー
        ctx.log("attach_payment_method_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return ctx.error(
          409,
          "ATTACH_FAILED",
          "支払い方法を顧客に紐付けできませんでした",
        );
      }
    }

    const card = pm.card ?? null;
    const cardHolderName =
      body.cardHolderName ?? pm.billing_details?.name ?? null;

    const insData = await ctx.callRpc(
      "ins_stripe_payment_method",
      {
        p_auth_user_id: ctx.authUserId,
        p_stripe_payment_method_id: body.stripePaymentMethodId,
        p_card_brand: card?.brand ?? "",
        p_card_last4: card?.last4 ?? "",
        p_card_exp_month: card?.exp_month
          ? String(card.exp_month).padStart(2, "0")
          : "",
        p_card_exp_year: card?.exp_year ? String(card.exp_year) : "",
        p_card_holder_name: cardHolderName ?? "",
        p_set_default: body.setDefault,
        p_created_program: "create-payment-method",
      },
      { admin: true },
    );

    const inserted = (insData as InsRpcRow[])?.[0];
    if (!inserted) {
      return ctx.error(500, "DB_ERROR", "支払い方法の登録に失敗しました");
    }

    // DB 上のデフォルトと Stripe 顧客のデフォルトを同期（ベストエフォート）
    if (inserted.is_default) {
      try {
        await updateCustomerDefaultPaymentMethod(ctx, {
          customerId: mUser.stripe_customer_id,
          paymentMethodId: inserted.stripe_payment_method_id,
        });
      } catch (err) {
        ctx.log("update_customer_default_pm_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const response: CreatePaymentMethodResponse = {
      id: inserted.id,
      stripePaymentMethodId: inserted.stripe_payment_method_id,
      isDefault: inserted.is_default,
    };

    return ctx.success(response, 201);
  }),
);
