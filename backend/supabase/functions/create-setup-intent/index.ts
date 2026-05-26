// ========================================
// Edge Function: create-setup-intent
// 認証ユーザーの Stripe Customer に対して SetupIntent を作成
// フロントは返却された client_secret で Stripe Elements 経由で
// off_session 用カードを保存できる
// ========================================

import { handler } from "../_shared/handler.ts";
import { createSetupIntent, isStripeId } from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface MUserRow {
  id: string;
  stripe_customer_id: string | null;
}

Deno.serve(
  handler(async (_req, ctx) => {
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
      return ctx.error(
        409,
        "NO_CUSTOMER",
        "Stripe Customer が未作成です。先に create-stripe-customer を呼んでください",
      );
    }

    const setupIntent = await createSetupIntent(ctx, {
      customerId: mUser.stripe_customer_id,
      usage: "off_session",
      metadata: {
        supabase_auth_user_id: ctx.authUserId,
        flow: "payment_method_registration",
      },
    });

    if (!setupIntent.id || !setupIntent.client_secret) {
      return ctx.error(
        502,
        "STRIPE_ERROR",
        "SetupIntent のレスポンスが不正です",
      );
    }

    return ctx.success(
      {
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
      },
      201,
    );
  }),
);
