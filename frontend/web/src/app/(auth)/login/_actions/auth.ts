"use server";

import { redirect } from "next/navigation";
import {
  ActionError,
  actionError,
  handler,
  validate,
} from "@/services/handler";
import { createClient } from "@/services/supabase/server";
import { LoginFormSchema } from "./schema";
import type { LoginState } from "./types";

export type { LoginState } from "./types";

function createSafeFormData(formData: FormData): FormData {
  const safeFormData = new FormData();
  safeFormData.set("email", formData.get("email") || "");
  return safeFormData;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const result = await handler(
    "loginAction",
    async (logger): Promise<LoginState> => {
      const { email, password } = validate(
        LoginFormSchema,
        {
          email: formData.get("email"),
          password: formData.get("password"),
        },
        logger,
      );

      const supabase = await createClient();

      logger.info("auth_attempt_start");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error(error, { context: "auth_signin" });
        throw new ActionError("ログインに失敗しました");
      }

      if (!data.user) {
        logger.warn("user_data_missing");
        throw new ActionError("ユーザー情報が取得できませんでした");
      }

      logger.info("login_success", {
        userId: data.user.id,
        email: data.user.email,
      });
      return { success: true, message: "ログインしました" };
    },
    {
      startMeta: { email: formData.get("email") },
      onError: (error): LoginState =>
        actionError(error, createSafeFormData(formData)) as LoginState,
    },
  );

  if (result.success) {
    redirect("/todos");
  }

  return result;
}
