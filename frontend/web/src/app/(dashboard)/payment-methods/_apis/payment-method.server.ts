"use server";

import { handler } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import {
  type PaymentMethod,
  PaymentMethodSchema,
} from "@/types/stripe-schemas";

/**
 * 支払い方法一覧を取得（Server Component から呼び出す）
 */
export async function getPaymentMethods(): Promise<PaymentMethod[] | null> {
  return handler(
    "getPaymentMethods",
    async (logger) => {
      const data = await callEdgeFunction(
        "get-payment-methods",
        PaymentMethodSchema.array(),
        { method: "GET", logger },
      );
      logger.info("payment_methods_fetched", { count: data.length });
      return data;
    },
    { onError: () => null },
  );
}
