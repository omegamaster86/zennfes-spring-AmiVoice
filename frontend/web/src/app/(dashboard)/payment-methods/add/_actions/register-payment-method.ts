"use server";

import { revalidatePath } from "next/cache";
import { ActionError, handler, validate } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import { CreatedPaymentMethodSchema } from "@/types/stripe-schemas";
import { RegisterPaymentMethodSchema } from "./schema";
import type { RegisterPaymentMethodResult } from "./types";

export type { RegisterPaymentMethodResult } from "./types";

/**
 * Stripe SetupIntent 完了後に PaymentMethod を顧客に紐付け、
 * m_stripe_payment_method に DB 反映する。
 *
 * フロント側は `useActionState` ではなく直接呼び出す
 * （Stripe Elements の confirmSetup と組み合わせるため）。
 */
export async function registerPaymentMethod(input: {
  stripePaymentMethodId: string;
  cardHolderName?: string | null;
  setDefault?: boolean;
}): Promise<RegisterPaymentMethodResult> {
  return handler(
    "registerPaymentMethod",
    async (logger): Promise<RegisterPaymentMethodResult> => {
      const validated = validate(RegisterPaymentMethodSchema, input, logger);

      await callEdgeFunction(
        "create-payment-method",
        CreatedPaymentMethodSchema,
        {
          method: "POST",
          body: {
            stripePaymentMethodId: validated.stripePaymentMethodId,
            cardHolderName: validated.cardHolderName ?? null,
            setDefault: validated.setDefault,
          },
          logger,
        },
      );

      revalidatePath("/payment-methods");
      return { success: true, message: "カードを登録しました" };
    },
    {
      onError: (error): RegisterPaymentMethodResult => ({
        success: false,
        message:
          error instanceof ActionError
            ? error.message
            : "予期しないエラーが発生しました",
      }),
    },
  );
}
