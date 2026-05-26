import type { CancelSubscriptionResult } from "@/types/stripe-schemas";

/**
 * サブスクリプション解約アクションの状態型
 */
export type CancelSubscriptionState = {
  success: boolean;
  message: string;
  payload?: FormData;
  result?: CancelSubscriptionResult;
};
