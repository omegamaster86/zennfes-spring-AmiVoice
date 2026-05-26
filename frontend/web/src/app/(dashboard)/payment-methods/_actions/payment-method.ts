"use server";

import { revalidatePath } from "next/cache";
import { actionError, handler, success, validate } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import {
  DeletedPaymentMethodSchema,
  UpdatedPaymentMethodSchema,
} from "@/types/stripe-schemas";
import {
  DeletePaymentMethodSchema,
  SetDefaultPaymentMethodSchema,
} from "./schema";
import type { PaymentMethodActionState } from "./types";

export type { PaymentMethodActionState } from "./types";

/**
 * デフォルト支払い方法を切り替える
 */
export async function setDefaultPaymentMethod(
  _prevState: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  return handler(
    "setDefaultPaymentMethod",
    async (logger): Promise<PaymentMethodActionState> => {
      const { stripePaymentMethodId } = validate(
        SetDefaultPaymentMethodSchema,
        { stripePaymentMethodId: formData.get("stripePaymentMethodId") },
        logger,
      );

      await callEdgeFunction(
        "update-payment-method",
        UpdatedPaymentMethodSchema,
        {
          method: "POST",
          body: {
            stripePaymentMethodId,
            setDefault: true,
          },
          logger,
        },
      );

      revalidatePath("/payment-methods");
      return success("デフォルトの支払い方法を変更しました");
    },
    {
      onError: (error): PaymentMethodActionState =>
        actionError(error, formData),
    },
  );
}

/**
 * 支払い方法を削除する
 */
export async function deletePaymentMethod(
  _prevState: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  return handler(
    "deletePaymentMethod",
    async (logger): Promise<PaymentMethodActionState> => {
      const { stripePaymentMethodId } = validate(
        DeletePaymentMethodSchema,
        { stripePaymentMethodId: formData.get("stripePaymentMethodId") },
        logger,
      );

      await callEdgeFunction(
        "delete-payment-method",
        DeletedPaymentMethodSchema,
        {
          method: "POST",
          body: { stripePaymentMethodId },
          logger,
        },
      );

      revalidatePath("/payment-methods");
      return success("支払い方法を削除しました");
    },
    {
      onError: (error): PaymentMethodActionState =>
        actionError(error, formData),
    },
  );
}
