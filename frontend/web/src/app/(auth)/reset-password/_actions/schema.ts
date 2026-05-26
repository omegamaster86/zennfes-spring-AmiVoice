import { z } from "zod";

export const ResetPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(1, "※パスワードは必須です")
      .min(6, "※パスワードは6文字以上で入力してください"),
    confirmPassword: z.string().min(1, "※パスワード（確認）は必須です"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "※パスワードが一致しません",
    path: ["confirmPassword"],
  });
