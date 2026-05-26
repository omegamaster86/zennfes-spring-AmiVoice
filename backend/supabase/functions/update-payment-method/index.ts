// ========================================
// Edge Function: update-payment-method
// 支払い方法の名義 / デフォルトフラグを更新
// Stripe 上の billing_details.name と顧客のデフォルトも同期
// ========================================

import { handler } from "../_shared/handler.ts";
import {
  type UpdatePaymentMethodResponse,
  updatePaymentMethodSchema,
} from "../_shared/schemas/update-payment-method-schema.ts";
import {
  isStripeId,
  updateCustomerDefaultPaymentMethod,
  updatePaymentMethodBillingName,
} from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface MUserRow {
  stripe_customer_id: string | null;
}

interface OwnedPmRow {
  id: string;
  is_default: boolean;
}

interface UpdRpcRow {
  id: string;
  stripe_payment_method_id: string;
  is_default: boolean;
  card_holder_name: string | null;
}

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(updatePaymentMethodSchema);

    const adminClient = createAdminClient();

    // 所有確認 + 顧客 ID 取得
    const { data: mUser, error: mUserErr } = await adminClient
      .from("m_user")
      .select("id, stripe_customer_id")
      .eq("supabase_auth_user_id", ctx.authUserId)
      .is("deleted_at", null)
      .maybeSingle<MUserRow & { id: string }>();

    if (mUserErr) {
      return ctx.error(500, "DB_ERROR", mUserErr.message);
    }
    if (!mUser) {
      return ctx.error(404, "USER_NOT_FOUND", "ユーザーレコードが存在しません");
    }

    const { data: owned, error: ownedErr } = await adminClient
      .from("m_stripe_payment_method")
      .select("id, is_default")
      .eq("user_id", mUser.id)
      .eq("stripe_payment_method_id", body.stripePaymentMethodId)
      .is("deleted_at", null)
      .maybeSingle<OwnedPmRow>();

    if (ownedErr) {
      return ctx.error(500, "DB_ERROR", ownedErr.message);
    }
    if (!owned) {
      return ctx.error(404, "NOT_FOUND", "対象の支払い方法が見つかりません");
    }

    // デフォルトを外すリクエストはサポートしない（最低 1 件は default を維持）
    if (owned.is_default && !body.setDefault) {
      return ctx.error(
        400,
        "CANNOT_UNSET_DEFAULT",
        "デフォルトを外すには別の支払い方法をデフォルトに設定してください",
      );
    }

    // Stripe: 名義変更（フロントから渡された場合のみ）
    if (body.cardHolderName) {
      await updatePaymentMethodBillingName(ctx, {
        paymentMethodId: body.stripePaymentMethodId,
        name: body.cardHolderName,
      });
    }

    // Stripe: 顧客のデフォルト支払い方法を切り替え
    if (
      body.setDefault &&
      mUser.stripe_customer_id &&
      isStripeId(mUser.stripe_customer_id, "cus_")
    ) {
      try {
        await updateCustomerDefaultPaymentMethod(ctx, {
          customerId: mUser.stripe_customer_id,
          paymentMethodId: body.stripePaymentMethodId,
        });
      } catch (err) {
        ctx.log("update_customer_default_pm_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // DB 反映
    const updData = await ctx.callRpc(
      "upd_stripe_payment_method",
      {
        p_auth_user_id: ctx.authUserId,
        p_stripe_payment_method_id: body.stripePaymentMethodId,
        p_card_holder_name: body.cardHolderName ?? "",
        p_set_default: body.setDefault,
        p_updated_program: "update-payment-method",
      },
      { admin: true },
    );

    const updated = (updData as UpdRpcRow[])?.[0];
    if (!updated) {
      return ctx.error(500, "DB_ERROR", "支払い方法の更新に失敗しました");
    }

    const response: UpdatePaymentMethodResponse = {
      id: updated.id,
      stripePaymentMethodId: updated.stripe_payment_method_id,
      isDefault: updated.is_default,
      cardHolderName: updated.card_holder_name,
    };

    return ctx.success(response);
  }),
);
