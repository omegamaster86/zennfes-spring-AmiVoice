import { z } from "npm:zod";

/**
 * create-amazon-giftcard-for-admin のリクエストボディ
 *
 * - amount: 発行金額（最小通貨単位の整数文字列。例: JPY なら "1000" = 1000円）
 * - currencyCode: ISO 4217 通貨コード（例: "JPY"）
 * - creationRequestId: Amazon 側の冪等キー（英数字 1〜40 文字）。
 *   省略時はサーバー側で UUID から生成する
 */
export const createAmazonGiftcardSchema = z.object({
  amount: z
    .string()
    .regex(/^[1-9]\d*$/, "amount must be a positive integer string"),
  currencyCode: z
    .string()
    .regex(/^[A-Z]{3}$/, "currencyCode must be ISO 4217 (3 uppercase letters)"),
  creationRequestId: z
    .string()
    .regex(
      /^[A-Za-z0-9]{1,40}$/,
      "creationRequestId must be 1-40 alphanumeric characters",
    )
    .optional(),
});

export type CreateAmazonGiftcardRequest = z.infer<
  typeof createAmazonGiftcardSchema
>;
