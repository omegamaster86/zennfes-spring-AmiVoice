// ========================================
// Edge Function: get-current-subscription
// 認証ユーザーの現在の有効サブスクリプション 1 件を取得
//
// Webhook の取りこぼし耐性のため、stripe_subscription_id が DB に存在する
// 場合は Stripe API から最新を取得して DB を「自己治癒同期」する。
// 失敗してもユーザー体験への影響を出さないようにベストエフォートで扱う。
// ========================================

import { ExternalApiError, handler } from "../_shared/handler.ts";
import { isStripeId, retrieveSubscription } from "../_shared/stripe.ts";

interface CurrentSubscriptionRpcRow {
  id: string;
  plan_id: string | null;
  plan_name: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "trialing"
    | "paused";
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  started_at: string | null;
  amount: number | null;
  currency: string | null;
  billing_interval: "month" | "year" | null;
  latest_invoice_status: string | null;
}

function unixToIso(value: number | null | undefined): string | null {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

Deno.serve(
  handler(
    async (_req, ctx) => {
      const data = await ctx.callRpc("sel_current_subscription_by_user", {
        p_auth_user_id: ctx.authUserId,
      });

      const row = ((data as CurrentSubscriptionRpcRow[]) ?? [])[0] ?? null;

      // Stripe API から最新を引いて DB を同期（ベストエフォート）
      if (
        row?.stripe_subscription_id &&
        isStripeId(row.stripe_subscription_id, "sub_")
      ) {
        try {
          const sub = await retrieveSubscription(ctx, {
            subscriptionId: row.stripe_subscription_id,
          });

          let latestInvoiceId: string | null = null;
          let latestInvoiceStatus: string | null = null;
          if (sub.latest_invoice && typeof sub.latest_invoice === "object") {
            latestInvoiceId = sub.latest_invoice.id ?? null;
            latestInvoiceStatus = sub.latest_invoice.status ?? null;
          } else if (typeof sub.latest_invoice === "string") {
            latestInvoiceId = sub.latest_invoice;
          }

          await ctx.callRpc(
            "upd_t_subscription_from_stripe",
            {
              p_subscription_id: null,
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
              p_updated_program: "get-current-subscription-sync",
            },
            { admin: true },
          );

          // 同期後の値を返却に反映（DB 上のスナップショットでは古い可能性があるため）
          row.status = sub.status as CurrentSubscriptionRpcRow["status"];
          row.current_period_start = unixToIso(sub.current_period_start);
          row.current_period_end = unixToIso(sub.current_period_end);
          row.cancel_at_period_end = sub.cancel_at_period_end;
          row.canceled_at = unixToIso(sub.canceled_at);
          row.started_at = unixToIso(sub.start_date);
          row.latest_invoice_status = latestInvoiceStatus;
        } catch (err) {
          if (err instanceof ExternalApiError) {
            ctx.log("retrieve_subscription_failed_best_effort", {
              error: err.message,
            });
          } else {
            ctx.log("retrieve_subscription_unknown_error", {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      if (row === null) {
        return ctx.success(null);
      }

      const response = {
        id: row.id,
        planId: row.plan_id,
        planName: row.plan_name,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripePriceId: row.stripe_price_id,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        canceledAt: row.canceled_at,
        startedAt: row.started_at,
        amount: row.amount,
        currency: row.currency,
        billingInterval: row.billing_interval,
        latestInvoiceStatus: row.latest_invoice_status,
      };

      return ctx.success(response);
    },
    { methods: ["GET"] },
  ),
);
