"use server";

import { revalidatePath } from "next/cache";
import { actionError, handler, success, validate } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import { PurchaseConfirmResultSchema } from "@/types/stripe-schemas";
import { ConfirmPurchaseSchema } from "./schema";
import type { ConfirmPurchaseState } from "./types";

export type { ConfirmPurchaseState } from "./types";

/**
 * 1 回限り課金を実行する
 *
 * - 成功: revalidatePath で /purchases を再生成しトーストで完了表示
 * - 失敗 (`status: "failed"`): メッセージとともに状態を返す
 * - 追加認証要求 (`status: "requires_action"`): clientSecret を返してフロントで stripe.handleNextAction を呼ぶ想定
 */
export async function confirmPurchase(
  _prevState: ConfirmPurchaseState,
  formData: FormData,
): Promise<ConfirmPurchaseState> {
  return handler(
    "confirmPurchase",
    async (logger): Promise<ConfirmPurchaseState> => {
      const { purchaseItemId, stripePaymentMethodId } = validate(
        ConfirmPurchaseSchema,
        {
          purchaseItemId: formData.get("purchaseItemId"),
          stripePaymentMethodId: formData.get("stripePaymentMethodId"),
        },
        logger,
      );

      const result = await callEdgeFunction(
        "purchase-confirm",
        PurchaseConfirmResultSchema,
        {
          method: "POST",
          body: { purchaseItemId, stripePaymentMethodId },
          logger,
        },
      );

      logger.info("purchase_result_received", {
        purchaseId: result.purchaseId,
        status: result.status,
      });

      if (result.status === "succeeded") {
        revalidatePath("/purchases");
        return { ...success("ご購入ありがとうございました"), result };
      }

      if (result.status === "requires_action") {
        return {
          success: false,
          message:
            "追加認証が必要です。お手数ですがブラウザの指示に従ってください。",
          payload: formData,
          result,
        };
      }

      // failed / pending
      return {
        success: false,
        message: result.failureReason ?? "お支払いに失敗しました",
        payload: formData,
        result,
      };
    },
    {
      onError: (error): ConfirmPurchaseState => actionError(error, formData),
    },
  );
}
