"use server";

import { handler } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import {
  type SetupIntent,
  SetupIntentSchema,
  StripeCustomerSchema,
} from "@/types/stripe-schemas";

/**
 * カード登録ページ初期化
 *
 * 1. create-stripe-customer で Stripe Customer を確保（冪等）
 * 2. create-setup-intent で SetupIntent を作成
 *
 * @returns 取得した SetupIntent。失敗時は null
 */
export async function prepareSetupIntent(): Promise<SetupIntent | null> {
  return handler(
    "prepareSetupIntent",
    async (logger) => {
      // Step 1: 顧客確保（冪等なので毎回呼んで OK）
      await callEdgeFunction("create-stripe-customer", StripeCustomerSchema, {
        method: "POST",
        logger,
      });

      // Step 2: SetupIntent 作成
      const setupIntent = await callEdgeFunction(
        "create-setup-intent",
        SetupIntentSchema,
        { method: "POST", logger },
      );
      logger.info("setup_intent_prepared", {
        setupIntentId: setupIntent.setupIntentId,
      });
      return setupIntent;
    },
    { onError: () => null },
  );
}
