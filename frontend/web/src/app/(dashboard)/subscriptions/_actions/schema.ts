import { z } from "zod";

/**
 * サブスクリプション解約アクションのフォームバリデーション
 *
 * 入力は不要（自分の active なサブスクリプションが対象）。
 * Form の構造を保つため空オブジェクトを定義する。
 */
export const CancelSubscriptionSchema = z.object({});
