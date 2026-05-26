import { z } from "zod";

/**
 * カード登録（PaymentMethod を Customer に attach + DB 登録）の引数スキーマ
 *
 * Stripe Elements で confirmSetup() が成功した後にフロントから呼ぶ Server Action 用。
 * 名義は任意（Stripe billing_details.name から取得した値を使う）。
 */
export const RegisterPaymentMethodSchema = z.object({
  stripePaymentMethodId: z
    .string()
    .min(1, "※支払い方法IDが取得できませんでした")
    .regex(/^pm_/, "※支払い方法IDの形式が不正です"),
  cardHolderName: z
    .string()
    .max(255, "※名義は255文字以内で入力してください")
    .optional()
    .nullable(),
  setDefault: z.boolean().default(false),
});
