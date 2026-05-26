"use server";

import { redirect } from "next/navigation";
import {
  ActionError,
  actionError,
  handler,
  validate,
} from "@/services/handler";
import { createClient } from "@/services/supabase/server";
import { SignupFormSchema } from "./schema";
import type { SignupState } from "./types";

export type { SignupState } from "./types";

function createSafeFormData(formData: FormData): FormData {
  const safe = new FormData();
  safe.set("email", formData.get("email") || "");
  return safe;
}

export async function signupAction(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const result = await handler(
    "signupAction",
    async (logger): Promise<SignupState> => {
      const { email, password } = validate(
        SignupFormSchema,
        {
          email: formData.get("email"),
          password: formData.get("password"),
          confirmPassword: formData.get("confirmPassword"),
        },
        logger,
      );

      const supabase = await createClient();

      logger.info("auth_signup_start");
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        logger.error(error, { context: "auth_signup" });
        throw new ActionError("アカウント登録に失敗しました");
      }

      if (!data.user) {
        logger.warn("user_data_missing");
        throw new ActionError("ユーザー情報が取得できませんでした");
      }

      if (data.session) {
        logger.info("create_user_record_start", { userId: data.user.id });
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
          const res = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ email }),
          });
          if (!res.ok) {
            logger.warn("create_user_record_failed", { status: res.status });
          } else {
            logger.info("create_user_record_success");
          }
        }
      }

      logger.info("signup_success", { userId: data.user.id });
      return { success: true, message: "アカウントを作成しました" };
    },
    {
      startMeta: { email: formData.get("email") },
      onError: (error): SignupState =>
        actionError(error, createSafeFormData(formData)) as SignupState,
    },
  );

  if (result.success) {
    redirect("/todos");
  }

  return result;
}
