/**
 * 支払い方法アクション共通の状態型
 */
export type PaymentMethodActionState = {
  success: boolean;
  message: string;
  payload?: FormData;
};
