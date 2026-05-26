"use server";

import { createLogger } from "@/services/logger";
import { createClient } from "@/services/supabase/server";
import { PostalCodeSearchSuccessResponseSchema } from "./schema";
import type { SearchPostalCodeResult } from "./types";

export type { SearchPostalCodeResult };

/**
 * 郵便番号から住所を検索する
 * Edge Function（postal-code-search）を呼び出す
 *
 * @param postalCode ハイフンなし7桁の郵便番号
 */
export async function searchPostalCode(
  postalCode: string,
): Promise<SearchPostalCodeResult | null> {
  const logger = createLogger("searchPostalCode");
  logger.start();

  const supabase = await createClient();

  try {
    // 認証検証
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error(userError, { context: "authentication" });
      logger.end({ success: false, errorMessage: "認証に失敗しました" });
      return null;
    }

    // セッション取得
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      logger.warn("session_not_found");
      logger.end({
        success: false,
        errorMessage: "セッションが見つかりません",
      });
      return null;
    }

    // Supabase URL取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      logger.error(new Error("NEXT_PUBLIC_SUPABASE_URL is not set"), {
        context: "config",
      });
      logger.end({ success: false, errorMessage: "サーバー設定エラー" });
      return null;
    }

    logger.info("edge_function_call_start", {
      function: "postal-code-search",
      method: "POST",
    });

    const response = await fetch(
      `${supabaseUrl}/functions/v1/postal-code-search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "X-Request-ID": logger.requestId,
        },
        body: JSON.stringify({ postalCode }),
      },
    );

    logger.info("edge_function_call_completed", { status: response.status });

    // 非2xx（Edge Function のビジネスエラー含む）はステータスで判定する
    // Supabase インフラ側のエラーもここで吸収する
    if (!response.ok) {
      const notFound = response.status === 404;
      logger.warn("edge_function_error_status", {
        status: response.status,
        notFound,
      });
      logger.end({
        success: false,
        errorMessage: notFound
          ? "住所が見つかりません"
          : "住所検索に失敗しました",
      });
      return { success: false, notFound };
    }

    // 200 OK のみスキーマでバリデーション
    const jsonData = await response.json();
    const validationResult =
      PostalCodeSearchSuccessResponseSchema.safeParse(jsonData);

    if (!validationResult.success) {
      logger.error(validationResult.error, { context: "response_validation" });
      logger.end({
        success: false,
        errorMessage: "レスポンスの形式が不正です",
      });
      return null;
    }

    logger.end({ success: true });
    return { success: true, data: validationResult.data.data };
  } catch (error) {
    logger.error(error, { context: "searchPostalCode" });
    logger.end({
      success: false,
      errorMessage: "予期しないエラーが発生しました",
    });
    return null;
  }
}
