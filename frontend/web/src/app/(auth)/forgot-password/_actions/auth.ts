"use server";

import {
  ActionError,
  actionError,
  handler,
  validate,
} from "@/services/handler";
import { createClient } from "@/services/supabase/server";
import { ForgotPasswordFormSchema } from "./schema";
import type { ForgotPasswordState } from "./types";

export type { ForgotPasswordState } from "./types";

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  return handler(
    "forgotPasswordAction",
    async (logger): Promise<ForgotPasswordState> => {
      const { email } = validate(
        ForgotPasswordFormSchema,
        { email: formData.get("email") },
        logger,
      );

      const supabase = await createClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

      logger.info("reset_password_email_start");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        logger.error(error, { context: "auth_reset_password" });
        throw new ActionError("メール送信に失敗しました");
      }

      logger.info("reset_password_email_sent");
      return {
        success: true,
        message:
          "パスワードリセット用のメールを送信しました。メールをご確認ください。",
      };
    },
    {
      startMeta: { email: formData.get("email") },
      onError: (error): ForgotPasswordState => {
        const payload = new FormData();
        payload.set("email", formData.get("email") || "");
        return actionError(error, payload) as ForgotPasswordState;
      },
    },
  );
}
