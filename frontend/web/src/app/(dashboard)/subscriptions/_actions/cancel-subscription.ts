"use server";

import { revalidatePath } from "next/cache";
import { actionError, handler, success } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import { CancelSubscriptionResultSchema } from "@/types/stripe-schemas";
import type { CancelSubscriptionState } from "./types";

export type { CancelSubscriptionState } from "./types";

/**
 * 現在のサブスクリプションを期末キャンセルする
 */
export async function cancelSubscription(
  _prevState: CancelSubscriptionState,
  formData: FormData,
): Promise<CancelSubscriptionState> {
  return handler(
    "cancelSubscription",
    async (logger): Promise<CancelSubscriptionState> => {
      const result = await callEdgeFunction(
        "cancel-subscription",
        CancelSubscriptionResultSchema,
        {
          method: "POST",
          body: {},
          logger,
        },
      );

      logger.info("subscription_canceled", {
        subscriptionId: result.subscriptionId,
        cancelAtPeriodEnd: result.cancelAtPeriodEnd,
      });

      revalidatePath("/subscriptions");
      return {
        ...success("解約予約が完了しました（期末まで利用可能です）"),
        result,
      };
    },
    {
      onError: (error): CancelSubscriptionState => actionError(error, formData),
    },
  );
}
