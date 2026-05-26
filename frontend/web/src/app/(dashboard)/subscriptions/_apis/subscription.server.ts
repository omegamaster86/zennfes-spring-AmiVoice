"use server";

import { handler } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import {
  type CurrentSubscription,
  CurrentSubscriptionSchema,
  type SubscriptionPlan,
  SubscriptionPlanSchema,
} from "@/types/stripe-schemas";

/**
 * サブスクリプションプラン一覧を取得
 */
export async function getSubscriptionPlans(): Promise<
  SubscriptionPlan[] | null
> {
  return handler(
    "getSubscriptionPlans",
    async (logger) => {
      const plans = await callEdgeFunction(
        "get-subscription-plans",
        SubscriptionPlanSchema.array(),
        { method: "GET", logger },
      );
      logger.info("subscription_plans_fetched", { count: plans.length });
      return plans;
    },
    { onError: () => null },
  );
}

/**
 * 単一プランを ID で取得（一覧から抽出）
 */
export async function getSubscriptionPlan(
  id: string,
): Promise<SubscriptionPlan | null> {
  const plans = await getSubscriptionPlans();
  if (plans === null) return null;
  return plans.find((p) => p.id === id) ?? null;
}

/**
 * 現在の有効サブスクリプションを取得（無契約時は null）
 */
export async function getCurrentSubscription(): Promise<CurrentSubscription | null> {
  return handler(
    "getCurrentSubscription",
    async (logger) => {
      const result = await callEdgeFunction(
        "get-current-subscription",
        CurrentSubscriptionSchema.nullable(),
        { method: "GET", logger },
      );
      logger.info("current_subscription_fetched", {
        hasSubscription: result !== null,
        status: result?.status,
      });
      return result;
    },
    { onError: () => null },
  );
}
