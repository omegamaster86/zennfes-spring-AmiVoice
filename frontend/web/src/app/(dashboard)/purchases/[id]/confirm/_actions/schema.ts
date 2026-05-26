import { z } from "zod";

/**
 * 購入確定アクションのフォームバリデーション
 */
export const ConfirmPurchaseSchema = z.object({
  purchaseItemId: z
    .string()
    .min(1, "※購入アイテムが指定されていません")
    .uuid("※購入アイテムIDの形式が不正です"),
  stripePaymentMethodId: z
    .string()
    .min(1, "※支払い方法を選択してください")
    .regex(/^pm_/, "※支払い方法の形式が不正です"),
});
