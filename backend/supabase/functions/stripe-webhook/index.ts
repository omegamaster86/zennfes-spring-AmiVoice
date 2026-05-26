// ========================================
// Edge Function: stripe-webhook
// Stripe Webhook を受信し、Subscription / Invoice 関連イベントを DB に同期する
//
// 重要:
//   - 本関数は verify_jwt = false で公開する（config.toml 参照）
//   - 認証ヘッダーではなく Stripe-Signature による署名検証を行う
//   - 受信本文は raw のまま検証する必要があるため、_shared/handler.ts は使わない
//   - Stripe Event ID で冪等性を確保（DB の UNIQUE 制約）
//   - 処理失敗時は 5xx を返して Stripe にリトライさせる（重複は 200）
// ========================================

import type { Json } from "../_shared/database.types.ts";
import { ExternalApiError } from "../_shared/handler.ts";
import { createRequestLogger } from "../_shared/logger.ts";
import { createJsonResponse, errorResponse } from "../_shared/response.ts";
import { verifyStripeWebhookSignature } from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

interface StripeSubscriptionEventObject {
  id: string;
  status: string;
  customer: string;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  start_date: number | null;
  ended_at: number | null;
  latest_invoice?: string | null;
}

interface StripeInvoiceEventObject {
  id: string;
  status: string | null;
  subscription?: string | null;
  payment_intent?: string | null;
}

// Supabase の生成型では RPC 引数が `?: string` のオプショナルとなり null を受け取らないため、
// 値が無い場合は `undefined` を返してプロパティを実質的に省略する。
function unixToIso(value: number | null | undefined): string | undefined {
  if (!value || !Number.isFinite(value)) return undefined;
  return new Date(value * 1000).toISOString();
}

async function handleSubscriptionEvent(
  obj: StripeSubscriptionEventObject,
  log: (msg: string, meta?: Record<string, unknown>) => void,
): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.rpc("upd_t_subscription_from_stripe", {
    p_stripe_subscription_id: obj.id,
    p_status: obj.status,
    p_current_period_start: unixToIso(obj.current_period_start),
    p_current_period_end: unixToIso(obj.current_period_end),
    p_cancel_at_period_end: obj.cancel_at_period_end,
    p_canceled_at: unixToIso(obj.canceled_at),
    p_started_at: unixToIso(obj.start_date),
    p_ended_at: unixToIso(obj.ended_at),
    p_latest_invoice_id:
      typeof obj.latest_invoice === "string" ? obj.latest_invoice : undefined,
    p_updated_program: "stripe-webhook",
  });

  if (error) {
    log("rpc_failed", {
      rpc: "upd_t_subscription_from_stripe",
      error: error.message,
    });
    throw new Error(`RPC failed: ${error.message}`);
  }
}

async function handleInvoiceEvent(
  obj: StripeInvoiceEventObject,
  log: (msg: string, meta?: Record<string, unknown>) => void,
): Promise<void> {
  if (!obj.subscription || typeof obj.subscription !== "string") {
    log("invoice_without_subscription_skipped", { invoiceId: obj.id });
    return;
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.rpc("upd_t_subscription_from_stripe", {
    p_stripe_subscription_id: obj.subscription,
    p_latest_invoice_id: obj.id,
    p_latest_invoice_status: obj.status ?? undefined,
    p_updated_program: "stripe-webhook",
  });

  if (error) {
    log("rpc_failed", {
      rpc: "upd_t_subscription_from_stripe",
      error: error.message,
    });
    throw new Error(`RPC failed: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  const logger = createRequestLogger(req);
  logger.loggingStart({ function: "stripe-webhook" });

  if (req.method !== "POST") {
    logger.loggingWarn("invalid method", { method: req.method });
    logger.loggingEnd(405);
    return errorResponse(405, "METHOD_NOT_ALLOWED", "POST only");
  }

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  if (!secret) {
    logger.loggingError(new Error("STRIPE_WEBHOOK_SECRET is not configured"));
    logger.loggingEnd(500);
    return errorResponse(500, "CONFIG_ERROR", "webhook secret missing");
  }

  const signature = req.headers.get("stripe-signature");
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    logger.loggingError(err, { context: "read body" });
    logger.loggingEnd(400);
    return errorResponse(400, "BAD_REQUEST", "failed to read body");
  }

  try {
    await verifyStripeWebhookSignature(rawBody, signature, secret);
  } catch (err) {
    if (err instanceof ExternalApiError) {
      logger.loggingWarn("signature verification failed", {
        message: err.message,
      });
      logger.loggingEnd(400);
      return errorResponse(400, "INVALID_SIGNATURE", err.message);
    }
    logger.loggingError(err, { context: "signature verification" });
    logger.loggingEnd(500);
    return errorResponse(500, "INTERNAL_ERROR", "signature verification error");
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch (err) {
    logger.loggingError(err, { context: "parse body" });
    logger.loggingEnd(400);
    return errorResponse(400, "BAD_REQUEST", "invalid JSON");
  }

  if (!event?.id || !event?.type || !event?.data?.object) {
    logger.loggingWarn("malformed event payload");
    logger.loggingEnd(400);
    return errorResponse(400, "BAD_REQUEST", "malformed event");
  }

  // 冪等チェック: 同一 event_id がすでに登録済みなら 200 で終了
  const adminClient = createAdminClient();
  const { data: insId, error: insErr } = await adminClient.rpc(
    "ins_stripe_webhook_event",
    {
      p_stripe_event_id: event.id,
      p_event_type: event.type,
      // StripeEvent は Json として安全に保存可能だが、生成された Json 型は
      // インデックス シグネチャを要求するため明示的にキャストする。
      p_payload: event as unknown as Json,
    },
  );

  if (insErr) {
    logger.loggingError(insErr, { context: "ins_stripe_webhook_event" });
    logger.loggingEnd(500);
    return errorResponse(500, "DB_ERROR", insErr.message);
  }

  if (insId === null) {
    logger.loggingInfo("duplicate event ignored", { eventId: event.id });
    logger.loggingEnd(200);
    return createJsonResponse({ success: true, duplicate: true }, 200);
  }

  // イベント分岐
  try {
    const log = (msg: string, meta?: Record<string, unknown>) =>
      logger.loggingInfo(msg, {
        eventId: event.id,
        eventType: event.type,
        ...meta,
      });

    log("event_received");

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.trial_will_end": {
        await handleSubscriptionEvent(
          event.data.object as unknown as StripeSubscriptionEventObject,
          log,
        );
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      case "invoice.payment_action_required":
      case "invoice.paid":
      case "invoice.finalized": {
        await handleInvoiceEvent(
          event.data.object as unknown as StripeInvoiceEventObject,
          log,
        );
        break;
      }
      default: {
        log("event_type_ignored");
        break;
      }
    }

    await adminClient.rpc("mark_stripe_webhook_event_processed", {
      p_stripe_event_id: event.id,
    });

    logger.loggingEnd(200);
    return createJsonResponse({ success: true }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.loggingError(err, { eventId: event.id, eventType: event.type });

    // 失敗を記録（リトライさせるため processed_at は埋めない）
    await adminClient.rpc("mark_stripe_webhook_event_processed", {
      p_stripe_event_id: event.id,
      p_error_message: msg,
    });

    logger.loggingEnd(500);
    return errorResponse(500, "PROCESSING_ERROR", msg);
  }
});
