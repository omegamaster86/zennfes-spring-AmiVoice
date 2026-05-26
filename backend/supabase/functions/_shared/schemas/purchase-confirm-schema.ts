import { z } from "npm:zod";

export const purchaseConfirmSchema = z.object({
  purchaseItemId: z.string().uuid("purchaseItemId must be a UUID"),
  stripePaymentMethodId: z
    .string()
    .min(1, "stripePaymentMethodId is required")
    .regex(/^pm_/, "stripePaymentMethodId must start with 'pm_'"),
});

export type PurchaseConfirmRequest = z.infer<typeof purchaseConfirmSchema>;

export interface PurchaseConfirmResponse {
  purchaseId: string;
  status: "succeeded" | "failed" | "requires_action" | "pending";
  amount: number;
  currency: string;
  itemName: string;
  stripePaymentIntentId: string | null;
  failureReason: string | null;
  /** 3DS など追加認証が必要な場合の client_secret（フロントで confirm するため） */
  clientSecret: string | null;
}
