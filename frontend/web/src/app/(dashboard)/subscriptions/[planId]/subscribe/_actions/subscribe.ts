"use server";

import { revalidatePath } from "next/cache";
import { actionError, handler, success, validate } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import { CreateSubscriptionResultSchema } from "@/types/stripe-schemas";
import { SubscribeSchema } from "./schema";
import type { SubscribeState } from "./types";

export type { SubscribeState } from "./types";

/**
 * サブスクリプションに加入する
 *
 * - 成功: revalidatePath で /subscriptions を再生成しトーストで完了表示
 * - 失敗: メッセージとともに状態を返す
 * - 追加認証要求 (`requiresAction = true`): clientSecret を返してフロント側で
 *   stripe.confirmCardPayment を呼ぶ想定
 */
export async function subscribe(
  _prevState: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  return handler(
    "subscribe",
    async (logger): Promise<SubscribeState> => {
      const { planId, stripePaymentMethodId } = validate(
        SubscribeSchema,
        {
          planId: formData.get("planId"),
          stripePaymentMethodId: formData.get("stripePaymentMethodId"),
        },
        logger,
      );

      const result = await callEdgeFunction(
        "create-subscription",
        CreateSubscriptionResultSchema,
        {
          method: "POST",
          body: { planId, stripePaymentMethodId },
          logger,
        },
      );

      logger.info("subscription_result_received", {
        subscriptionId: result.subscriptionId,
        status: result.status,
        requiresAction: result.requiresAction,
      });

      if (
        (result.status === "active" || result.status === "trialing") &&
        !result.requiresAction
      ) {
        revalidatePath("/subscriptions");
        return { ...success("ご加入ありがとうございました"), result };
      }

      if (result.requiresAction) {
        return {
          success: false,
          message:
            "追加認証が必要です。お手数ですがブラウザの指示に従ってください。",
          payload: formData,
          result,
        };
      }

      return {
        success: false,
        message:
          result.failureReason ?? "サブスクリプションへの加入に失敗しました",
        payload: formData,
        result,
      };
    },
    {
      onError: (error): SubscribeState => actionError(error, formData),
    },
  );
}
