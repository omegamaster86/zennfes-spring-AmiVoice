import { z } from "npm:zod";

function normalizePostalCode(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export const postalCodeSearchSchema = z.object({
  postalCode: z
    .preprocess(
      (val) => (val === null || val === undefined ? "" : String(val)),
      z.string(),
    )
    .transform((v) => normalizePostalCode(v))
    .refine((v) => /^\d{7}$/.test(v), "郵便番号が不正です"),
});

export type PostalCodeSearchBody = z.infer<typeof postalCodeSearchSchema>;
