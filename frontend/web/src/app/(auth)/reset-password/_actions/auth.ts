"use server";

import { redirect } from "next/navigation";
import {
  ActionError,
  actionError,
  handler,
  validate,
} from "@/services/handler";
import { createClient } from "@/services/supabase/server";
import { ResetPasswordFormSchema } from "./schema";
import type { ResetPasswordState } from "./types";

export type { ResetPasswordState } from "./types";

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const result = await handler(
    "resetPasswordAction",
    async (logger): Promise<ResetPasswordState> => {
      const { password } = validate(
        ResetPasswordFormSchema,
        {
          password: formData.get("password"),
          confirmPassword: formData.get("confirmPassword"),
        },
        logger,
      );

      const supabase = await createClient();

      logger.info("update_password_start");
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        logger.error(error, { context: "auth_update_password" });
        throw new ActionError("パスワードの更新に失敗しました");
      }

      logger.info("update_password_success");
      return { success: true, message: "パスワードを更新しました" };
    },
    {
      onError: (error): ResetPasswordState =>
        actionError(error) as ResetPasswordState,
    },
  );

  if (result.success) {
    redirect("/login");
  }

  return result;
}
