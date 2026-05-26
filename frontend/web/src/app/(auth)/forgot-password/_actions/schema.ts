import { z } from "zod";

export const ForgotPasswordFormSchema = z.object({
  email: z
    .string()
    .email({ message: "※有効なメールアドレスを入力してください" })
    .min(1, "※メールアドレスは必須です"),
});
