import type { PurchaseConfirmResult } from "@/types/stripe-schemas";

/**
 * 購入確定アクションの状態型
 */
export type ConfirmPurchaseState = {
  success: boolean;
  message: string;
  payload?: FormData;
  fieldErrors?: {
    purchaseItemId?: string[];
    stripePaymentMethodId?: string[];
  };
  /** 課金結果（成功・追加認証要求・失敗を区別する用） */
  result?: PurchaseConfirmResult;
};
