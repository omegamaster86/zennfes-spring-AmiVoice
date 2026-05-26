import { z } from "npm:zod";

export const updatePaymentMethodSchema = z.object({
  stripePaymentMethodId: z
    .string()
    .min(1, "stripePaymentMethodId is required")
    .regex(/^pm_/, "stripePaymentMethodId must start with 'pm_'"),
  cardHolderName: z.string().trim().min(1).max(255).nullish(),
  setDefault: z.boolean().default(false),
});

export type UpdatePaymentMethodRequest = z.infer<
  typeof updatePaymentMethodSchema
>;

export interface UpdatePaymentMethodResponse {
  id: string;
  stripePaymentMethodId: string;
  isDefault: boolean;
  cardHolderName: string | null;
}
