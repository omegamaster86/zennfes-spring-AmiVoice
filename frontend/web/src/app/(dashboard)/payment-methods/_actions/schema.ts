import { z } from "zod";

/**
 * デフォルト支払い方法切り替えのバリデーションスキーマ
 */
export const SetDefaultPaymentMethodSchema = z.object({
  stripePaymentMethodId: z
    .string()
    .min(1, "※支払い方法IDが指定されていません")
    .regex(/^pm_/, "※支払い方法IDの形式が不正です"),
});

/**
 * 支払い方法削除のバリデーションスキーマ
 */
export const DeletePaymentMethodSchema = z.object({
  stripePaymentMethodId: z
    .string()
    .min(1, "※支払い方法IDが指定されていません")
    .regex(/^pm_/, "※支払い方法IDの形式が不正です"),
});
