import { z } from "npm:zod";

export const createSubscriptionSchema = z.object({
  planId: z.string().uuid("planId must be a UUID"),
  stripePaymentMethodId: z
    .string()
    .min(1, "stripePaymentMethodId is required")
    .regex(/^pm_/, "stripePaymentMethodId must start with 'pm_'"),
});

export type CreateSubscriptionRequest = z.infer<
  typeof createSubscriptionSchema
>;

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  stripeSubscriptionId: string | null;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "trialing"
    | "paused";
  planName: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** 3DS など追加認証が必要な場合の client_secret（latest_invoice.payment_intent.client_secret） */
  clientSecret: string | null;
  /** 追加認証要求時にフロントが状態判定に使う */
  requiresAction: boolean;
  failureReason: string | null;
}
