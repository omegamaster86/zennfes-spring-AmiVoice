import { z } from "npm:zod";

export const cancelSubscriptionSchema = z.object({}).optional();

export type CancelSubscriptionRequest = z.infer<
  typeof cancelSubscriptionSchema
>;

export interface CancelSubscriptionResponse {
  subscriptionId: string;
  stripeSubscriptionId: string;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "trialing"
    | "paused";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}
