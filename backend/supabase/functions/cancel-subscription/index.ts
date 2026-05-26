// ========================================
// Edge Function: cancel-subscription
// 認証ユーザーの有効サブスクリプションを「期末キャンセル」予約する
//
// 1. ユーザーの active/trialing なサブスクリプションを 1 件特定
// 2. Stripe で cancel_at_period_end=true に設定
// 3. 結果を t_subscription に反映
// ========================================

import { handler } from "../_shared/handler.ts";
import type { CancelSubscriptionResponse } from "../_shared/schemas/cancel-subscription-schema.ts";
import {
  cancelSubscriptionAtPeriodEnd,
  isStripeId,
} from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface MUserRow {
  id: string;
}

interface ActiveSubRow {
  id: string;
  stripe_subscription_id: string | null;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "trialing"
    | "paused";
  cancel_at_period_end: boolean;
  current_period_end: string | null;
}

function unixToIso(value: number | null | undefined): string | null {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

Deno.serve(
  handler(async (_req, ctx) => {
    const adminClient = createAdminClient();

    const { data: mUser, error: mUserErr } = await adminClient
      .from("m_user")
      .select("id")
      .eq("supabase_auth_user_id", ctx.authUserId)
      .is("deleted_at", null)
      .maybeSingle<MUserRow>();

    if (mUserErr) {
      return ctx.error(500, "DB_ERROR", mUserErr.message);
    }
    if (!mUser) {
      return ctx.error(404, "USER_NOT_FOUND", "ユーザーレコードが存在しません");
    }

    const { data: activeRows, error: activeErr } = await adminClient
      .from("t_subscription")
      .select(
        "id, stripe_subscription_id, status, cancel_at_period_end, current_period_end",
      )
      .eq("user_id", mUser.id)
      .is("deleted_at", null)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (activeErr) {
      return ctx.error(500, "DB_ERROR", activeErr.message);
    }
    const active = (activeRows as ActiveSubRow[] | null)?.[0];
    if (!active) {
      return ctx.error(
        404,
        "NO_ACTIVE_SUBSCRIPTION",
        "解約可能なサブスクリプションが見つかりません",
      );
    }
    if (
      !active.stripe_subscription_id ||
      !isStripeId(active.stripe_subscription_id, "sub_")
    ) {
      return ctx.error(
        409,
        "NO_STRIPE_ID",
        "Stripe 上のサブスクリプションが未確定です",
      );
    }

    // Stripe 上で期末キャンセルを予約
    const sub = await cancelSubscriptionAtPeriodEnd(ctx, {
      subscriptionId: active.stripe_subscription_id,
    });

    // 結果を DB に反映
    await ctx.callRpc(
      "upd_t_subscription_from_stripe",
      {
        p_subscription_id: active.id,
        p_stripe_subscription_id: sub.id,
        p_status: sub.status,
        p_current_period_start: unixToIso(sub.current_period_start),
        p_current_period_end: unixToIso(sub.current_period_end),
        p_cancel_at_period_end: sub.cancel_at_period_end,
        p_canceled_at: unixToIso(sub.canceled_at),
        p_updated_program: "cancel-subscription",
      },
      { admin: true },
    );

    const response: CancelSubscriptionResponse = {
      subscriptionId: active.id,
      stripeSubscriptionId: sub.id,
      status: sub.status as CancelSubscriptionResponse["status"],
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: unixToIso(sub.current_period_end),
    };

    return ctx.success(response);
  }),
);
