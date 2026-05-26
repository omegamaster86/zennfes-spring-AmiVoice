import { z } from "zod";

/**
 * サブスクリプション加入アクションのフォームバリデーション
 */
export const SubscribeSchema = z.object({
  planId: z
    .string()
    .min(1, "※プランが指定されていません")
    .uuid("※プランIDの形式が不正です"),
  stripePaymentMethodId: z
    .string()
    .min(1, "※支払い方法を選択してください")
    .regex(/^pm_/, "※支払い方法の形式が不正です"),
});
