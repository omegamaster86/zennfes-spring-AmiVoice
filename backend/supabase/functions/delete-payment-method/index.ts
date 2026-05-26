// ========================================
// Edge Function: delete-payment-method
// 支払い方法を Stripe からデタッチし、DB を論理削除
// 削除対象がデフォルトだった場合、最古の他レコードを自動でデフォルト昇格させ、
// Stripe 顧客のデフォルトも同期（昇格対象が無ければデフォルトを解除）
// ========================================

import { handler } from "../_shared/handler.ts";
import {
  type DeletePaymentMethodResponse,
  deletePaymentMethodSchema,
} from "../_shared/schemas/delete-payment-method-schema.ts";
import {
  clearCustomerDefaultPaymentMethod,
  detachPaymentMethod,
  isStripeId,
  updateCustomerDefaultPaymentMethod,
} from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface MUserRow {
  id: string;
  stripe_customer_id: string | null;
}

interface OwnedPmRow {
  id: string;
  is_default: boolean;
}

interface DelRpcRow {
  deleted_id: string;
  promoted_default_stripe_payment_method_id: string | null;
}

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(deletePaymentMethodSchema);

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

    // Stripe からデタッチ
    await detachPaymentMethod(ctx, {
      paymentMethodId: body.stripePaymentMethodId,
    });

    // DB 論理削除 + デフォルト昇格
    const delData = await ctx.callRpc(
      "del_stripe_payment_method",
      {
        p_auth_user_id: ctx.authUserId,
        p_stripe_payment_method_id: body.stripePaymentMethodId,
        p_updated_program: "delete-payment-method",
      },
      { admin: true },
    );

    const delRow = (delData as DelRpcRow[])?.[0];
    if (!delRow) {
      return ctx.error(500, "DB_ERROR", "支払い方法の削除に失敗しました");
    }

    // Stripe 顧客のデフォルト同期（ベストエフォート）
    if (
      mUser.stripe_customer_id &&
      isStripeId(mUser.stripe_customer_id, "cus_")
    ) {
      try {
        if (
          delRow.promoted_default_stripe_payment_method_id &&
          isStripeId(delRow.promoted_default_stripe_payment_method_id, "pm_")
        ) {
          await updateCustomerDefaultPaymentMethod(ctx, {
            customerId: mUser.stripe_customer_id,
            paymentMethodId: delRow.promoted_default_stripe_payment_method_id,
          });
        } else if (owned.is_default) {
          await clearCustomerDefaultPaymentMethod(ctx, {
            customerId: mUser.stripe_customer_id,
          });
        }
      } catch (err) {
        ctx.log("sync_customer_default_pm_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const response: DeletePaymentMethodResponse = {
      deletedId: delRow.deleted_id,
      promotedDefaultStripePaymentMethodId:
        delRow.promoted_default_stripe_payment_method_id,
    };

    return ctx.success(response);
  }),
);
