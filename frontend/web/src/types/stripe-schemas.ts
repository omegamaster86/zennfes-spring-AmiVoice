import { z } from "zod";

/**
 * Stripe 関連の共通 Zod スキーマ定義
 *
 * Edge Function のレスポンス検証 / Server Action 引数検証で再利用する。
 */

// ----------------------------------------------------------------------------
// Payment Method
// ----------------------------------------------------------------------------

/**
 * 支払い方法（カード）スキーマ
 * Edge Function `get-payment-methods` の戻り値に対応
 */
export const PaymentMethodSchema = z.object({
  id: z.string().uuid(),
  stripePaymentMethodId: z.string().regex(/^pm_/),
  isDefault: z.boolean(),
  type: z.string(),
  cardBrand: z.string().nullable(),
  cardLast4: z.string().nullable(),
  cardExpMonth: z.string().nullable(),
  cardExpYear: z.string().nullable(),
  cardHolderName: z.string().nullable(),
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * `create-stripe-customer` レスポンス
 */
export const StripeCustomerSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  stripeCustomerId: z.string().regex(/^cus_/),
});

export type StripeCustomer = z.infer<typeof StripeCustomerSchema>;

/**
 * `create-setup-intent` レスポンス
 */
export const SetupIntentSchema = z.object({
  setupIntentId: z.string().regex(/^seti_/),
  clientSecret: z.string(),
});

export type SetupIntent = z.infer<typeof SetupIntentSchema>;

/**
 * `create-payment-method` レスポンス
 */
export const CreatedPaymentMethodSchema = z.object({
  id: z.string().uuid(),
  stripePaymentMethodId: z.string().regex(/^pm_/),
  isDefault: z.boolean(),
});

export type CreatedPaymentMethod = z.infer<typeof CreatedPaymentMethodSchema>;

/**
 * `update-payment-method` レスポンス
 */
export const UpdatedPaymentMethodSchema = CreatedPaymentMethodSchema.extend({
  cardHolderName: z.string().nullable(),
});

/**
 * `delete-payment-method` レスポンス
 */
export const DeletedPaymentMethodSchema = z.object({
  deletedId: z.string().uuid(),
  promotedDefaultStripePaymentMethodId: z.string().nullable(),
});

// ----------------------------------------------------------------------------
// Purchase
// ----------------------------------------------------------------------------

/**
 * 購入可能アイテム
 * Edge Function `get-purchase-items` の戻り値に対応
 */
export const PurchaseItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  amount: z.number().int().positive(),
  currency: z.string().regex(/^[a-z]{3}$/),
  displayOrder: z.number().int(),
});

export type PurchaseItem = z.infer<typeof PurchaseItemSchema>;

/**
 * 購入履歴ステータス
 */
export const PurchaseStatusSchema = z.enum([
  "pending",
  "succeeded",
  "failed",
  "requires_action",
]);

export type PurchaseStatus = z.infer<typeof PurchaseStatusSchema>;

/**
 * 購入履歴（一覧）
 * Edge Function `get-purchases` の戻り値に対応
 */
export const PurchaseSchema = z.object({
  id: z.string().uuid(),
  itemName: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: PurchaseStatusSchema,
  failureReason: z.string().nullable(),
  succeededAt: z.string().nullable(),
  createdAt: z.string(),
});

export type Purchase = z.infer<typeof PurchaseSchema>;

/**
 * 購入実行レスポンス
 * Edge Function `purchase-confirm` の戻り値に対応
 */
export const PurchaseConfirmResultSchema = z.object({
  purchaseId: z.string().uuid(),
  status: PurchaseStatusSchema,
  amount: z.number().int(),
  currency: z.string(),
  itemName: z.string(),
  stripePaymentIntentId: z.string().nullable(),
  failureReason: z.string().nullable(),
  clientSecret: z.string().nullable(),
});

export type PurchaseConfirmResult = z.infer<typeof PurchaseConfirmResultSchema>;

// ----------------------------------------------------------------------------
// Subscription
// ----------------------------------------------------------------------------

/**
 * Stripe Subscription status と同一値
 */
export const SubscriptionStatusSchema = z.enum([
  "incomplete",
  "incomplete_expired",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "trialing",
  "paused",
]);

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

/**
 * 請求間隔
 */
export const BillingIntervalSchema = z.enum(["month", "year"]);

export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

/**
 * サブスクリプションプラン
 * Edge Function `get-subscription-plans` の戻り値に対応
 */
export const SubscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  stripePriceId: z.string().regex(/^price_/),
  amount: z.number().int().positive(),
  currency: z.string().regex(/^[a-z]{3}$/),
  billingInterval: BillingIntervalSchema,
  displayOrder: z.number().int(),
});

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

/**
 * 現在のサブスクリプション
 * Edge Function `get-current-subscription` の戻り値に対応（無契約時は null）
 */
export const CurrentSubscriptionSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid().nullable(),
  planName: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
  status: SubscriptionStatusSchema,
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  amount: z.number().int().nullable(),
  currency: z.string().nullable(),
  billingInterval: BillingIntervalSchema.nullable(),
  latestInvoiceStatus: z.string().nullable(),
});

export type CurrentSubscription = z.infer<typeof CurrentSubscriptionSchema>;

/**
 * 加入実行レスポンス
 * Edge Function `create-subscription` の戻り値に対応
 */
export const CreateSubscriptionResultSchema = z.object({
  subscriptionId: z.string().uuid(),
  stripeSubscriptionId: z.string().nullable(),
  status: SubscriptionStatusSchema,
  planName: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  clientSecret: z.string().nullable(),
  requiresAction: z.boolean(),
  failureReason: z.string().nullable(),
});

export type CreateSubscriptionResult = z.infer<
  typeof CreateSubscriptionResultSchema
>;

/**
 * 解約レスポンス
 * Edge Function `cancel-subscription` の戻り値に対応
 */
export const CancelSubscriptionResultSchema = z.object({
  subscriptionId: z.string().uuid(),
  stripeSubscriptionId: z.string(),
  status: SubscriptionStatusSchema,
  cancelAtPeriodEnd: z.boolean(),
  currentPeriodEnd: z.string().nullable(),
});

export type CancelSubscriptionResult = z.infer<
  typeof CancelSubscriptionResultSchema
>;
