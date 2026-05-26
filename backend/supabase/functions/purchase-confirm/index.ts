// ========================================
// Edge Function: purchase-confirm
// 1 回限り課金フロー
//
// 1. m_purchase_item から金額の真実値を取得
// 2. ユーザーが対象 PaymentMethod を所有していることを検証
// 3. t_purchase に pending で履歴を作成（ID = Stripe Idempotency-Key）
// 4. Stripe PaymentIntent を即時 confirm で作成
// 5. 結果を t_purchase に反映し、フロントに返却
//
// 3DS 等の追加認証が必要な場合は status=requires_action と client_secret を返し、
// フロント側で stripe.confirmCardPayment 等を呼んでもらう想定
// ========================================

import { ExternalApiError, handler } from "../_shared/handler.ts";
import {
  type PurchaseConfirmResponse,
  purchaseConfirmSchema,
} from "../_shared/schemas/purchase-confirm-schema.ts";
import {
  createPaymentIntent,
  isStripeId,
  type StripePaymentIntent,
} from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface MUserRow {
  id: string;
  stripe_customer_id: string | null;
}

interface OwnedPmRow {
  id: string;
}

interface PurchaseItemRow {
  id: string;
  name: string;
  amount: number;
  currency: string;
}

interface InsRpcRow {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
}

type PurchaseStatus = PurchaseConfirmResponse["status"];

function mapPurchaseStatus(stripeStatus: string): PurchaseStatus {
  if (stripeStatus === "succeeded") return "succeeded";
  if (
    stripeStatus === "requires_action" ||
    stripeStatus === "requires_confirmation" ||
    stripeStatus === "requires_source_action"
  ) {
    return "requires_action";
  }
  if (stripeStatus === "processing" || stripeStatus === "requires_capture") {
    // 同期 confirm では通常到達しないが、保守的に pending 扱い
    return "pending";
  }
  return "failed";
}

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(purchaseConfirmSchema);

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

    // ── 3. 商品（金額の真実値）の取得 ──
    const itemData = await ctx.callRpc(
      "sel_purchase_item_for_charge",
      { p_purchase_item_id: body.purchaseItemId },
      { admin: true },
    );
    const item = (itemData as PurchaseItemRow[])?.[0];
    if (!item) {
      return ctx.error(404, "ITEM_NOT_FOUND", "購入アイテムが見つかりません");
    }

    // ── 4. pending で履歴を作成（ID を Idempotency-Key として使用） ──
    const insData = await ctx.callRpc(
      "ins_t_purchase",
      {
        p_auth_user_id: ctx.authUserId,
        p_purchase_item_id: item.id,
        p_item_name: item.name,
        p_amount: item.amount,
        p_currency: item.currency,
        p_stripe_payment_method_id: body.stripePaymentMethodId,
        p_created_program: "purchase-confirm",
      },
      { admin: true },
    );
    const purchase = (insData as InsRpcRow[])?.[0];
    if (!purchase) {
      return ctx.error(500, "DB_ERROR", "購入履歴の作成に失敗しました");
    }

    ctx.log("purchase_pending_created", {
      purchaseId: purchase.id,
      amount: purchase.amount,
      currency: purchase.currency,
    });

    // ── 5. PaymentIntent を即時 confirm で作成 ──
    let pi: StripePaymentIntent | null = null;
    let stripeError: { message: string; code?: string } | null = null;

    try {
      pi = await createPaymentIntent(ctx, {
        amount: purchase.amount,
        currency: purchase.currency,
        customerId: mUser.stripe_customer_id,
        paymentMethodId: body.stripePaymentMethodId,
        offSession: true,
        confirm: true,
        description: `Purchase: ${item.name}`,
        idempotencyKey: purchase.id,
        metadata: {
          purchase_id: purchase.id,
          purchase_item_id: item.id,
          supabase_auth_user_id: ctx.authUserId,
          m_user_id: mUser.id,
        },
      });
    } catch (err) {
      // Stripe 4xx（カードエラー等）は handler が ExternalApiError として throw する
      // ここで catch して履歴を failed にしてからレスポンスを返す
      if (err instanceof ExternalApiError) {
        stripeError = { message: err.message };
      } else {
        stripeError = {
          message: err instanceof Error ? err.message : String(err),
        };
      }
      ctx.log("payment_intent_creation_failed", {
        purchaseId: purchase.id,
        error: stripeError.message,
      });
    }

    // ── 6. 結果を履歴に反映 ──
    const finalStatus: PurchaseStatus = pi
      ? mapPurchaseStatus(String(pi.status ?? ""))
      : "failed";

    await ctx.callRpc(
      "upd_t_purchase_result",
      {
        p_purchase_id: purchase.id,
        p_status: finalStatus,
        p_stripe_payment_intent_id: pi?.id ?? null,
        p_failure_reason:
          finalStatus === "failed" ? (stripeError?.message ?? null) : null,
        p_updated_program: "purchase-confirm",
      },
      { admin: true },
    );

    const response: PurchaseConfirmResponse = {
      purchaseId: purchase.id,
      status: finalStatus,
      amount: purchase.amount,
      currency: purchase.currency,
      itemName: item.name,
      stripePaymentIntentId: pi?.id ?? null,
      failureReason:
        finalStatus === "failed" ? (stripeError?.message ?? null) : null,
      clientSecret:
        finalStatus === "requires_action" ? (pi?.client_secret ?? null) : null,
    };

    return ctx.success(response, finalStatus === "succeeded" ? 201 : 200);
  }),
);
