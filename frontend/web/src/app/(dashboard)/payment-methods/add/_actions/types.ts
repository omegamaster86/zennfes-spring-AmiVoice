/**
 * カード登録 Server Action のレスポンス
 */
export type RegisterPaymentMethodResult =
  | { success: true; message: string }
  | { success: false; message: string };
