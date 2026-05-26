import type { CreateSubscriptionResult } from "@/types/stripe-schemas";

/**
 * サブスクリプション加入アクションの状態型
 */
export type SubscribeState = {
  success: boolean;
  message: string;
  payload?: FormData;
  fieldErrors?: {
    planId?: string[];
    stripePaymentMethodId?: string[];
  };
  /** 加入結果（成功・追加認証要求・失敗を区別する用） */
  result?: CreateSubscriptionResult;
};
