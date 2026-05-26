import { z } from "npm:zod";

export const deletePaymentMethodSchema = z.object({
  stripePaymentMethodId: z
    .string()
    .min(1, "stripePaymentMethodId is required")
    .regex(/^pm_/, "stripePaymentMethodId must start with 'pm_'"),
});

export type DeletePaymentMethodRequest = z.infer<
  typeof deletePaymentMethodSchema
>;

export interface DeletePaymentMethodResponse {
  deletedId: string;
  promotedDefaultStripePaymentMethodId: string | null;
}
