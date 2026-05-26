// ========================================
// Edge Function: create-stripe-customer
// 認証ユーザーを Stripe Customer に紐付ける（冪等）
// 既に stripe_customer_id を持っていれば既存値を返す
// ========================================

import { handler } from "../_shared/handler.ts";
import { createCustomer, isStripeId } from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface MUserRow {
  id: string;
  email: string;
  stripe_customer_id: string | null;
}

interface UpdRpcRow {
  id: string;
  email: string;
  stripe_customer_id: string;
}

Deno.serve(
  handler(async (_req, ctx) => {
    const adminClient = createAdminClient();

    const { data: mUser, error: mUserErr } = await adminClient
      .from("m_user")
      .select("id, email, stripe_customer_id")
      .eq("supabase_auth_user_id", ctx.authUserId)
      .is("deleted_at", null)
      .maybeSingle<MUserRow>();

    if (mUserErr) {
      return ctx.error(500, "DB_ERROR", mUserErr.message);
    }
    if (!mUser) {
      return ctx.error(
        404,
        "USER_NOT_FOUND",
        "ユーザーレコードが存在しません。先に create-user を呼んでください",
      );
    }

    if (
      mUser.stripe_customer_id &&
      isStripeId(mUser.stripe_customer_id, "cus_")
    ) {
      ctx.log("stripe_customer_already_exists", { userId: mUser.id });
      return ctx.success({
        id: mUser.id,
        email: mUser.email,
        stripeCustomerId: mUser.stripe_customer_id,
      });
    }

    const customer = await createCustomer(ctx, {
      email: mUser.email,
      metadata: {
        supabase_auth_user_id: ctx.authUserId,
        m_user_id: mUser.id,
      },
    });

    if (!isStripeId(customer.id, "cus_")) {
      return ctx.error(
        502,
        "STRIPE_ERROR",
        "Stripe customer の作成に失敗しました",
      );
    }

    const updData = await ctx.callRpc(
      "upd_m_user_stripe_customer_id",
      {
        p_auth_user_id: ctx.authUserId,
        p_stripe_customer_id: customer.id,
        p_updated_program: "create-stripe-customer",
      },
      { admin: true },
    );

    const updRow = (updData as UpdRpcRow[])?.[0];
    return ctx.success(
      {
        id: updRow?.id ?? mUser.id,
        email: updRow?.email ?? mUser.email,
        stripeCustomerId: updRow?.stripe_customer_id ?? customer.id,
      },
      201,
    );
  }),
);
