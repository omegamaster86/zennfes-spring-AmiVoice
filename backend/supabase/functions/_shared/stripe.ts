// ========================================
// Stripe REST API ラッパー (Edge Functions / Deno)
// SDK を使わず application/x-www-form-urlencoded で直接呼び出す
// すべての関数は HandlerContext.callExternalApi を経由して
// ログ・エラー変換を統一する
// ========================================

import { ExternalApiError, type HandlerContext } from "./handler.ts";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

/** Stripe API キーを環境変数から取得（未設定時は ExternalApiError） */
function getStripeSecretKey(): string {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new ExternalApiError("STRIPE_SECRET_KEY is not configured", 500);
  }
  return key;
}

/** Stripe ID プレフィックスチェック */
export function isStripeId(value: unknown, prefix: string): value is string {
  return (
    typeof value === "string" &&
    value.length > prefix.length &&
    value.startsWith(prefix)
  );
}

/** key/value を Stripe 互換の URL エンコード本文に変換 */
function buildForm(
  params: Record<string, string | number | boolean | undefined | null>,
  metadata?: Record<string, string>,
): string {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    form.set(k, typeof v === "boolean" ? (v ? "true" : "false") : String(v));
  }
  if (metadata) {
    for (const [k, v] of Object.entries(metadata)) {
      form.set(`metadata[${k}]`, v);
    }
  }
  return form.toString();
}

/** Stripe REST 呼び出し共通ラッパー（HandlerContext.callExternalApi を使用） */
async function callStripe(
  ctx: HandlerContext,
  label: string,
  path: string,
  init: {
    method: "GET" | "POST";
    body?: string;
    idempotencyKey?: string;
  },
): Promise<Record<string, unknown>> {
  const secret = getStripeSecretKey();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
  };
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  if (init.idempotencyKey) {
    headers["Idempotency-Key"] = init.idempotencyKey;
  }

  const result = await ctx.callExternalApi(
    `stripe.${label}`,
    `${STRIPE_API_BASE}${path}`,
    {
      method: init.method,
      headers,
      body: init.body,
    },
  );
  return (result ?? {}) as Record<string, unknown>;
}

// =====================================================
// Customer
// =====================================================

export interface StripeCustomer {
  id: string;
  email: string | null;
  [key: string]: unknown;
}

export async function createCustomer(
  ctx: HandlerContext,
  input: {
    email?: string | null;
    name?: string | null;
    metadata?: Record<string, string>;
  },
): Promise<StripeCustomer> {
  const body = buildForm(
    { email: input.email ?? undefined, name: input.name ?? undefined },
    input.metadata,
  );
  const data = await callStripe(ctx, "create_customer", "/customers", {
    method: "POST",
    body,
  });
  return data as StripeCustomer;
}

export async function updateCustomerEmail(
  ctx: HandlerContext,
  input: { customerId: string; email: string },
): Promise<StripeCustomer> {
  if (!isStripeId(input.customerId, "cus_")) {
    throw new ExternalApiError("invalid stripe customer id", 400);
  }
  const body = buildForm({ email: input.email });
  const data = await callStripe(
    ctx,
    "update_customer_email",
    `/customers/${encodeURIComponent(input.customerId)}`,
    { method: "POST", body },
  );
  return data as StripeCustomer;
}

export async function updateCustomerDefaultPaymentMethod(
  ctx: HandlerContext,
  input: { customerId: string; paymentMethodId: string },
): Promise<StripeCustomer> {
  if (!isStripeId(input.customerId, "cus_")) {
    throw new ExternalApiError("invalid stripe customer id", 400);
  }
  if (!isStripeId(input.paymentMethodId, "pm_")) {
    throw new ExternalApiError("invalid stripe payment method id", 400);
  }
  const body = buildForm({
    "invoice_settings[default_payment_method]": input.paymentMethodId,
  });
  const data = await callStripe(
    ctx,
    "update_customer_default_pm",
    `/customers/${encodeURIComponent(input.customerId)}`,
    { method: "POST", body },
  );
  return data as StripeCustomer;
}

export async function clearCustomerDefaultPaymentMethod(
  ctx: HandlerContext,
  input: { customerId: string },
): Promise<StripeCustomer> {
  if (!isStripeId(input.customerId, "cus_")) {
    throw new ExternalApiError("invalid stripe customer id", 400);
  }
  const body = buildForm({ "invoice_settings[default_payment_method]": "" });
  const data = await callStripe(
    ctx,
    "clear_customer_default_pm",
    `/customers/${encodeURIComponent(input.customerId)}`,
    { method: "POST", body },
  );
  return data as StripeCustomer;
}

// =====================================================
// SetupIntent
// =====================================================

export interface StripeSetupIntent {
  id: string;
  client_secret: string;
  status: string;
  [key: string]: unknown;
}

export async function createSetupIntent(
  ctx: HandlerContext,
  input: {
    customerId: string;
    usage?: "off_session" | "on_session";
    paymentMethodId?: string;
    metadata?: Record<string, string>;
  },
): Promise<StripeSetupIntent> {
  if (!isStripeId(input.customerId, "cus_")) {
    throw new ExternalApiError("invalid stripe customer id", 400);
  }
  if (input.paymentMethodId && !isStripeId(input.paymentMethodId, "pm_")) {
    throw new ExternalApiError("invalid stripe payment method id", 400);
  }

  const params: Record<string, string | undefined> = {
    customer: input.customerId,
    usage: input.usage ?? "off_session",
    "payment_method_types[]": "card",
  };
  if (input.paymentMethodId) {
    params.payment_method = input.paymentMethodId;
  }

  const body = buildForm(params, input.metadata);
  const data = await callStripe(ctx, "create_setup_intent", "/setup_intents", {
    method: "POST",
    body,
  });
  return data as StripeSetupIntent;
}

// =====================================================
// PaymentMethod
// =====================================================

export interface StripePaymentMethod {
  id: string;
  type: string;
  customer: string | null;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: {
    name?: string | null;
  };
  [key: string]: unknown;
}

export async function retrievePaymentMethod(
  ctx: HandlerContext,
  input: { paymentMethodId: string },
): Promise<StripePaymentMethod> {
  if (!isStripeId(input.paymentMethodId, "pm_")) {
    throw new ExternalApiError("invalid stripe payment method id", 400);
  }
  const data = await callStripe(
    ctx,
    "retrieve_payment_method",
    `/payment_methods/${encodeURIComponent(input.paymentMethodId)}`,
    { method: "GET" },
  );
  return data as StripePaymentMethod;
}

export async function attachPaymentMethod(
  ctx: HandlerContext,
  input: { paymentMethodId: string; customerId: string },
): Promise<StripePaymentMethod> {
  if (!isStripeId(input.paymentMethodId, "pm_")) {
    throw new ExternalApiError("invalid stripe payment method id", 400);
  }
  if (!isStripeId(input.customerId, "cus_")) {
    throw new ExternalApiError("invalid stripe customer id", 400);
  }
  const body = buildForm({ customer: input.customerId });
  const data = await callStripe(
    ctx,
    "attach_payment_method",
    `/payment_methods/${encodeURIComponent(input.paymentMethodId)}/attach`,
    { method: "POST", body },
  );
  return data as StripePaymentMethod;
}

export async function detachPaymentMethod(
  ctx: HandlerContext,
  input: { paymentMethodId: string },
): Promise<StripePaymentMethod> {
  if (!isStripeId(input.paymentMethodId, "pm_")) {
    throw new ExternalApiError("invalid stripe payment method id", 400);
  }
  const data = await callStripe(
    ctx,
    "detach_payment_method",
    `/payment_methods/${encodeURIComponent(input.paymentMethodId)}/detach`,
    { method: "POST", body: "" },
  );
  return data as StripePaymentMethod;
}

export async function updatePaymentMethodBillingName(
  ctx: HandlerContext,
  input: { paymentMethodId: string; name: string },
): Promise<StripePaymentMethod> {
  if (!isStripeId(input.paymentMethodId, "pm_")) {
    throw new ExternalApiError("invalid stripe payment method id", 400);
  }
  const body = buildForm({ "billing_details[name]": input.name });
  const data = await callStripe(
    ctx,
    "update_payment_method",
    `/payment_methods/${encodeURIComponent(input.paymentMethodId)}`,
    { method: "POST", body },
  );
  return data as StripePaymentMethod;
}

// =====================================================
// PaymentIntent (将来の 1 回課金フロー用に最低限のみ提供)
// =====================================================

export interface StripePaymentIntent {
  id: string;
  status: string;
  client_secret: string | null;
  amount: number;
  currency: string;
  [key: string]: unknown;
}

export async function createPaymentIntent(
  ctx: HandlerContext,
  input: {
    amount: number;
    currency: string;
    customerId: string;
    paymentMethodId: string;
    offSession?: boolean;
    confirm?: boolean;
    description?: string;
    metadata?: Record<string, string>;
    idempotencyKey: string;
  },
): Promise<StripePaymentIntent> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new ExternalApiError("amount must be a positive integer", 400);
  }
  if (!/^[a-z]{3}$/.test(input.currency)) {
    throw new ExternalApiError(
      "currency must be a 3-letter lowercase code",
      400,
    );
  }
  if (!isStripeId(input.customerId, "cus_")) {
    throw new ExternalApiError("invalid stripe customer id", 400);
  }
  if (!isStripeId(input.paymentMethodId, "pm_")) {
    throw new ExternalApiError("invalid stripe payment method id", 400);
  }

  const body = buildForm(
    {
      amount: input.amount,
      currency: input.currency,
      customer: input.customerId,
      payment_method: input.paymentMethodId,
      off_session: input.offSession ?? false,
      confirm: input.confirm ?? true,
      description: input.description,
    },
    input.metadata,
  );

  const data = await callStripe(
    ctx,
    "create_payment_intent",
    "/payment_intents",
    {
      method: "POST",
      body,
      idempotencyKey: input.idempotencyKey,
    },
  );
  return data as StripePaymentIntent;
}

export async function retrievePaymentIntent(
  ctx: HandlerContext,
  input: { paymentIntentId: string },
): Promise<StripePaymentIntent> {
  if (!isStripeId(input.paymentIntentId, "pi_")) {
    throw new ExternalApiError("invalid stripe payment intent id", 400);
  }
  const data = await callStripe(
    ctx,
    "retrieve_payment_intent",
    `/payment_intents/${encodeURIComponent(input.paymentIntentId)}`,
    { method: "GET" },
  );
  return data as StripePaymentIntent;
}

// =====================================================
// Subscription
// =====================================================

export interface StripeSubscriptionItem {
  id: string;
  price?: { id: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface StripeInvoiceLite {
  id: string;
  status: string | null;
  payment_intent?:
    | string
    | {
        id: string;
        status: string;
        client_secret: string | null;
        [key: string]: unknown;
      }
    | null;
  [key: string]: unknown;
}

export interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  start_date: number | null;
  ended_at: number | null;
  default_payment_method: string | null;
  items?: { data: StripeSubscriptionItem[] };
  latest_invoice?: string | StripeInvoiceLite | null;
  [key: string]: unknown;
}

/**
 * Subscription を作成する
 *
 * `expand[]=latest_invoice.payment_intent` を付与することで、初回請求の PaymentIntent
 * を展開取得し、3DS 認証が必要な場合の `client_secret` をフロントに返せる
 */
export async function createSubscription(
  ctx: HandlerContext,
  input: {
    customerId: string;
    priceId: string;
    defaultPaymentMethodId: string;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  },
): Promise<StripeSubscription> {
  if (!isStripeId(input.customerId, "cus_")) {
    throw new ExternalApiError("invalid stripe customer id", 400);
  }
  if (!isStripeId(input.priceId, "price_")) {
    throw new ExternalApiError("invalid stripe price id", 400);
  }
  if (!isStripeId(input.defaultPaymentMethodId, "pm_")) {
    throw new ExternalApiError("invalid stripe payment method id", 400);
  }

  const params: Record<string, string> = {
    customer: input.customerId,
    "items[0][price]": input.priceId,
    default_payment_method: input.defaultPaymentMethodId,
    "payment_settings[save_default_payment_method]": "on_subscription",
    "expand[0]": "latest_invoice.payment_intent",
  };

  const body = buildForm(params, input.metadata);
  const data = await callStripe(ctx, "create_subscription", "/subscriptions", {
    method: "POST",
    body,
    idempotencyKey: input.idempotencyKey,
  });
  return data as StripeSubscription;
}

export async function retrieveSubscription(
  ctx: HandlerContext,
  input: { subscriptionId: string },
): Promise<StripeSubscription> {
  if (!isStripeId(input.subscriptionId, "sub_")) {
    throw new ExternalApiError("invalid stripe subscription id", 400);
  }
  const data = await callStripe(
    ctx,
    "retrieve_subscription",
    `/subscriptions/${encodeURIComponent(input.subscriptionId)}?expand[0]=latest_invoice.payment_intent`,
    { method: "GET" },
  );
  return data as StripeSubscription;
}

export async function cancelSubscriptionAtPeriodEnd(
  ctx: HandlerContext,
  input: { subscriptionId: string },
): Promise<StripeSubscription> {
  if (!isStripeId(input.subscriptionId, "sub_")) {
    throw new ExternalApiError("invalid stripe subscription id", 400);
  }
  const body = buildForm({ cancel_at_period_end: true });
  const data = await callStripe(
    ctx,
    "cancel_subscription_at_period_end",
    `/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
    { method: "POST", body },
  );
  return data as StripeSubscription;
}

export async function resumeSubscription(
  ctx: HandlerContext,
  input: { subscriptionId: string },
): Promise<StripeSubscription> {
  if (!isStripeId(input.subscriptionId, "sub_")) {
    throw new ExternalApiError("invalid stripe subscription id", 400);
  }
  const body = buildForm({ cancel_at_period_end: false });
  const data = await callStripe(
    ctx,
    "resume_subscription",
    `/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
    { method: "POST", body },
  );
  return data as StripeSubscription;
}

// =====================================================
// Webhook 署名検証
// =====================================================

/**
 * `Stripe-Signature` ヘッダ（`t=...,v1=...`）を解析するヘルパー
 */
function parseStripeSignatureHeader(header: string): {
  timestamp: number;
  signatures: string[];
} {
  const parts = header.split(",").map((p) => p.trim());
  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq);
    const v = part.slice(eq + 1);
    if (k === "t") {
      const n = Number(v);
      if (Number.isFinite(n)) timestamp = n;
    } else if (k === "v1") {
      signatures.push(v);
    }
  }
  return { timestamp, signatures };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Stripe Webhook 署名検証（HMAC-SHA256）
 *
 * - 検証成功時は何も返さない
 * - 失敗時は `ExternalApiError` を投げる（呼び出し側で 400 として返却を推奨）
 */
export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<void> {
  if (!signatureHeader) {
    throw new ExternalApiError("missing Stripe-Signature header", 400);
  }
  if (!secret) {
    throw new ExternalApiError("STRIPE_WEBHOOK_SECRET is not configured", 500);
  }

  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  if (timestamp <= 0 || signatures.length === 0) {
    throw new ExternalApiError("malformed Stripe-Signature header", 400);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > toleranceSeconds) {
    throw new ExternalApiError(
      "Stripe-Signature timestamp is outside tolerance",
      400,
    );
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedPayload = `${timestamp}.${payload}`;
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(signedPayload),
  );
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  for (const sig of signatures) {
    if (timingSafeEqual(sig, expected)) {
      return;
    }
  }

  throw new ExternalApiError("Stripe-Signature verification failed", 400);
}
