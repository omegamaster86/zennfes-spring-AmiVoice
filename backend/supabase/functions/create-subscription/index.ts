// ========================================
// Edge Function: create-subscription
// サブスクリプション加入フロー
//
// 1. ユーザー / Stripe Customer 取得
// 2. PaymentMethod の所有検証
// 3. プラン（金額/Price ID の真実値）を取得
// 4. t_subscription に incomplete で履歴を作成（ID = Idempotency-Key）
// 5. Stripe Subscription を作成（expand=latest_invoice.payment_intent）
// 6. 結果を t_subscription に反映
// 7. 3DS 等の追加認証が必要な場合は client_secret を返してフロントで confirm
// ========================================

import { ExternalApiError, handler } from "../_shared/handler.ts";
import {
  type CreateSubscriptionResponse,
  createSubscriptionSchema,
} from "../_shared/schemas/create-subscription-schema.ts";
import {
  createSubscription,
  isStripeId,
  type StripeSubscription,
} from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface MUserRow {
  id: string;
  stripe_customer_id: string | null;
}

interface OwnedPmRow {
  id: string;
}

interface PlanRow {
  id: string;
  name: string;
  stripe_price_id: string;
  amount: number;
  currency: string;
  billing_interval: "month" | "year";
}

interface InsRpcRow {
  id: string;
  user_id: string;
}

type SubscriptionStatus = CreateSubscriptionResponse["status"];

function unixToIso(value: number | null | undefined): string | null {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function extractPaymentIntent(sub: StripeSubscription): {
  status: string | null;
  clientSecret: string | null;
} {
  const inv = sub.latest_invoice;
  if (!inv || typeof inv === "string")
    return { status: null, clientSecret: null };
  const pi = inv.payment_intent;
  if (!pi || typeof pi === "string")
    return { status: null, clientSecret: null };
  return {
    status: typeof pi.status === "string" ? pi.status : null,
    clientSecret:
      typeof pi.client_secret === "string" ? pi.client_secret : null,
  };
}

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(createSubscriptionSchema);

    const adminClient = createAdminClient();

    // ── 1. ユーザー & Stripe Customer の取得 ──
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

    // ── 2. PaymentMethod の所有検証 ──
    const { data: ownedPm, error: ownedErr } = await adminClient
      .from("m_stripe_payment_method")
      .select("id")
      .eq("user_id", mUser.id)
      .eq("stripe_payment_method_id", body.stripePaymentMethodId)
      .is("deleted_at", null)
      .maybeSingle<OwnedPmRow>();

    if (ownedErr) {
      return ctx.error(500, "DB_ERROR", ownedErr.message);
    }
    if (!ownedPm) {
      return ctx.error(
        404,
        "PM_NOT_FOUND",
        "指定された支払い方法が見つかりません",
      );
    }

    // ── 3. プラン（真実値）の取得 ──
    const planData = await ctx.callRpc(
      "sel_subscription_plan_for_charge",
      { p_plan_id: body.planId },
      { admin: true },
    );
    const plan = (planData as PlanRow[])?.[0];
    if (!plan) {
      return ctx.error(404, "PLAN_NOT_FOUND", "プランが見つかりません");
    }

    // ── 4. 多重加入の防止 ──
    // 同一ユーザーで active/trialing/past_due/incomplete のサブスクが既にある場合は拒否
    const { data: existingActive, error: existingErr } = await adminClient
      .from("t_subscription")
      .select("id, status")
      .eq("user_id", mUser.id)
      .is("deleted_at", null)
      .in("status", ["active", "trialing", "past_due", "incomplete"]);

    if (existingErr) {
      return ctx.error(500, "DB_ERROR", existingErr.message);
    }
    if (existingActive && existingActive.length > 0) {
      return ctx.error(
        409,
        "ALREADY_SUBSCRIBED",
        "既にご利用中のサブスクリプションがあります",
      );
    }

    // ── 5. incomplete で履歴を作成（ID を Idempotency-Key として使用） ──
    const insData = await ctx.callRpc(
      "ins_t_subscription",
      {
        p_auth_user_id: ctx.authUserId,
        p_plan_id: plan.id,
        p_stripe_price_id: plan.stripe_price_id,
        p_created_program: "create-subscription",
      },
      { admin: true },
    );
    const created = (insData as InsRpcRow[])?.[0];
    if (!created) {
      return ctx.error(
        500,
        "DB_ERROR",
        "サブスクリプション履歴の作成に失敗しました",
      );
    }

    ctx.log("subscription_pending_created", {
      subscriptionId: created.id,
      planId: plan.id,
    });

    // ── 6. Stripe Subscription 作成 ──
    let sub: StripeSubscription | null = null;
    let stripeError: { message: string } | null = null;
    try {
      sub = await createSubscription(ctx, {
        customerId: mUser.stripe_customer_id,
        priceId: plan.stripe_price_id,
        defaultPaymentMethodId: body.stripePaymentMethodId,
        idempotencyKey: created.id,
        metadata: {
          subscription_record_id: created.id,
          plan_id: plan.id,
          supabase_auth_user_id: ctx.authUserId,
          m_user_id: mUser.id,
        },
      });
    } catch (err) {
      if (err instanceof ExternalApiError) {
        stripeError = { message: err.message };
      } else {
        stripeError = {
          message: err instanceof Error ? err.message : String(err),
        };
      }
      ctx.log("subscription_creation_failed", {
        subscriptionId: created.id,
        error: stripeError.message,
      });
    }

    // ── 7. 結果を履歴に反映 ──
    let latestInvoiceId: string | null = null;
    let latestInvoiceStatus: string | null = null;
    if (sub?.latest_invoice && typeof sub.latest_invoice === "object") {
      latestInvoiceId = sub.latest_invoice.id ?? null;
      latestInvoiceStatus = sub.latest_invoice.status ?? null;
    } else if (typeof sub?.latest_invoice === "string") {
      latestInvoiceId = sub.latest_invoice;
    }

    if (sub) {
      await ctx.callRpc(
        "upd_t_subscription_from_stripe",
        {
          p_subscription_id: created.id,
          p_stripe_subscription_id: sub.id,
          p_status: sub.status,
          p_current_period_start: unixToIso(sub.current_period_start),
          p_current_period_end: unixToIso(sub.current_period_end),
          p_cancel_at_period_end: sub.cancel_at_period_end,
          p_canceled_at: unixToIso(sub.canceled_at),
          p_started_at: unixToIso(sub.start_date),
          p_ended_at: unixToIso(sub.ended_at),
          p_latest_invoice_id: latestInvoiceId,
          p_latest_invoice_status: latestInvoiceStatus,
          p_updated_program: "create-subscription",
        },
        { admin: true },
      );
    } else {
      // Stripe API 失敗時は incomplete_expired として閉じる
      await ctx.callRpc(
        "upd_t_subscription_from_stripe",
        {
          p_subscription_id: created.id,
          p_status: "incomplete_expired",
          p_updated_program: "create-subscription",
        },
        { admin: true },
      );
    }

    const status = (sub?.status ?? "incomplete_expired") as SubscriptionStatus;
    const pi = sub
      ? extractPaymentIntent(sub)
      : { status: null, clientSecret: null };
    const requiresAction =
      pi.status === "requires_action" ||
      pi.status === "requires_confirmation" ||
      pi.status === "requires_source_action";

    const response: CreateSubscriptionResponse = {
      subscriptionId: created.id,
      stripeSubscriptionId: sub?.id ?? null,
      status,
      planName: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      currentPeriodEnd: unixToIso(sub?.current_period_end ?? null),
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      clientSecret: requiresAction ? pi.clientSecret : null,
      requiresAction,
      failureReason: stripeError?.message ?? null,
    };

    const httpStatus = status === "active" || status === "trialing" ? 201 : 200;
    return ctx.success(response, httpStatus);
  }),
);
