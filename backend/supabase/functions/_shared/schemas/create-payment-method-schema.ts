import { z } from "npm:zod";

export const createPaymentMethodSchema = z.object({
  stripePaymentMethodId: z
    .string()
    .min(1, "stripePaymentMethodId is required")
    .regex(/^pm_/, "stripePaymentMethodId must start with 'pm_'"),
  cardHolderName: z.string().trim().min(1).max(255).nullish(),
  setDefault: z.boolean().default(false),
});

export type CreatePaymentMethodRequest = z.infer<
  typeof createPaymentMethodSchema
>;

export interface CreatePaymentMethodResponse {
  id: string;
  stripePaymentMethodId: string;
  isDefault: boolean;
}
