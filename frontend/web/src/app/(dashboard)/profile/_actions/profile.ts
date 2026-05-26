"use server";

import { createLogger } from "@/services/logger";
import { createClient } from "@/services/supabase/server";
import { UpdateEmailSchema, UpdatePasswordSchema } from "./schema";
import type { UpdateEmailState, UpdatePasswordState } from "./types";

export type { UpdateEmailState, UpdatePasswordState } from "./types";

export async function updateEmailAction(
  _prevState: UpdateEmailState,
  formData: FormData,
): Promise<UpdateEmailState> {
  const logger = createLogger("updateEmailAction");
  logger.start({ email: formData.get("email") });

  try {
    const rawFormData = { email: formData.get("email") };
    const validationResult = UpdateEmailSchema.safeParse(rawFormData);

    if (!validationResult.success) {
      const fieldErrors: UpdateEmailState["fieldErrors"] = {};
      for (const issue of validationResult.error.issues) {
        const path = issue.path[0] as keyof NonNullable<
          UpdateEmailState["fieldErrors"]
        >;
        fieldErrors[path] ??= [];
        fieldErrors[path].push(issue.message);
      }
      logger.warn("validation_failed", { fieldErrors });
      logger.end({ success: false, errorMessage: "入力内容が不正です" });

      const payload = new FormData();
      payload.set("email", formData.get("email") || "");
      return {
        success: false,
        message: "入力内容が不正です",
        payload,
        fieldErrors,
      };
    }

    const { email } = validationResult.data;
    const supabase = await createClient();

    logger.info("update_email_start");
    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      logger.error(error, { context: "auth_update_email" });
      logger.end({
        success: false,
        errorMessage: "メールアドレスの変更に失敗しました",
      });
      return { success: false, message: "メールアドレスの変更に失敗しました" };
    }

    const { data: claimsData } = await (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return { data: null };
      return supabase.auth.getClaims(session.access_token);
    })();

    if (claimsData?.claims?.sub) {
      const { error: dbError } = await supabase
        .from("m_user")
        .update({
          email,
          updated_program: "updateEmailAction",
        })
        .eq("supabase_auth_user_id", claimsData.claims.sub as string)
        .is("deleted_at", null);

      if (dbError) {
        logger.warn("m_user_email_update_failed", { error: dbError.message });
      }
    }

    logger.info("update_email_success");
    logger.end({ success: true });
    return {
      success: true,
      message:
        "確認メールを送信しました。現在のメールアドレスと新しいメールアドレスの両方に届いたリンクをクリックして変更を完了してください。",
    };
  } catch (error) {
    logger.error(error, { context: "updateEmailAction" });
    logger.end({
      success: false,
      errorMessage: "予期しないエラーが発生しました",
    });
    return { success: false, message: "予期しないエラーが発生しました" };
  }
}

export async function updatePasswordAction(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const logger = createLogger("updatePasswordAction");
  logger.start();

  try {
    const rawFormData = {
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    const validationResult = UpdatePasswordSchema.safeParse(rawFormData);

    if (!validationResult.success) {
      const fieldErrors: UpdatePasswordState["fieldErrors"] = {};
      for (const issue of validationResult.error.issues) {
        const path = issue.path[0] as keyof NonNullable<
          UpdatePasswordState["fieldErrors"]
        >;
        fieldErrors[path] ??= [];
        fieldErrors[path].push(issue.message);
      }
      logger.warn("validation_failed", { fieldErrors });
      logger.end({ success: false, errorMessage: "入力内容が不正です" });
      return { success: false, message: "入力内容が不正です", fieldErrors };
    }

    const { password } = validationResult.data;
    const supabase = await createClient();

    logger.info("update_password_start");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      logger.error(error, { context: "auth_update_password" });
      logger.end({
        success: false,
        errorMessage: "パスワードの変更に失敗しました",
      });
      return { success: false, message: "パスワードの変更に失敗しました" };
    }

    logger.info("update_password_success");
    logger.end({ success: true });
    return { success: true, message: "パスワードを変更しました" };
  } catch (error) {
    logger.error(error, { context: "updatePasswordAction" });
    logger.end({
      success: false,
      errorMessage: "予期しないエラーが発生しました",
    });
    return { success: false, message: "予期しないエラーが発生しました" };
  }
}
