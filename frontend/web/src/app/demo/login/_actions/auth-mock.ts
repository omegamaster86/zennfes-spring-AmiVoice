"use server";

import { redirect } from "next/navigation";
import { createLogger } from "@/services/logger";
import {
  clearCurrentUser,
  findUserByEmail,
  setCurrentUser,
} from "@/services/mock-store/stores/auth";
import type { ActionResponse } from "@/types/demo-types";
import { LoginFormSchema } from "./schema";
import type { LoginMockState } from "./types";

export type { LoginMockState } from "./types";

export async function loginMockAction(
  _prevState: LoginMockState,
  formData: FormData,
): Promise<LoginMockState> {
  const logger = createLogger("loginMockAction");
  logger.start({ email: formData.get("email") });

  try {
    const rawFormData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const validationResult = LoginFormSchema.safeParse(rawFormData);

    if (!validationResult.success) {
      const fieldErrors: {
        email?: string[];
        password?: string[];
      } = {};

      for (const issue of validationResult.error.issues) {
        const path = issue.path[0] as string;
        if (!fieldErrors[path as keyof typeof fieldErrors]) {
          fieldErrors[path as keyof typeof fieldErrors] = [];
        }
        fieldErrors[path as keyof typeof fieldErrors]?.push(issue.message);
      }

      logger.warn("validation_failed", { fieldErrors });
      logger.end({ success: false, errorMessage: "入力内容が不正です" });

      return {
        success: false,
        message: "入力内容が不正です",
        payload: formData,
        fieldErrors,
      };
    }

    const validatedData = validationResult.data;

    const user = findUserByEmail(validatedData.email);

    if (!user) {
      logger.warn("user_not_found", { email: validatedData.email });
      logger.end({
        success: false,
        errorMessage: "ユーザーが見つかりません",
      });
      return {
        success: false,
        message: "ログインに失敗しました",
        payload: formData,
      };
    }

    setCurrentUser(user);

    logger.info("login_success", { userId: user.id, email: user.email });
    logger.end({ success: true });
  } catch (error) {
    logger.error(error, { context: "loginMockAction" });
    logger.end({
      success: false,
      errorMessage: "予期しないエラーが発生しました",
    });
    return {
      success: false,
      message: "予期しないエラーが発生しました",
      payload: formData,
    };
  }

  redirect("/demo/todos");
}

export async function logoutMockAction(): Promise<ActionResponse<void>> {
  const logger = createLogger("logoutMockAction");
  logger.start();

  try {
    clearCurrentUser();

    logger.info("logout_success");
    logger.end({ success: true });

    return {
      success: true,
      message: "ログアウトしました",
    };
  } catch (error) {
    logger.error(error, { context: "logoutMockAction" });
    logger.end({ success: false, errorMessage: "ログアウトに失敗しました" });
    return {
      success: false,
      message: "ログアウトに失敗しました",
      error: "UNEXPECTED_ERROR",
    };
  }
}
