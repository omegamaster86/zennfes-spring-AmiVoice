import { z } from "zod";

export const LoginFormSchema = z.object({
  email: z
    .string()
    .email({
      message: "※有効なメールアドレスを入力してください",
    })
    .min(1, "※メールアドレスは必須です"),
  password: z
    .string()
    .min(1, "※パスワードは必須です")
    .min(6, "※パスワードは6文字以上で入力してください"),
});
