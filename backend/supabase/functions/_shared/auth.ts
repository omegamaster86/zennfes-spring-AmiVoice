// ========================================
// 認証関連ユーティリティ
// ========================================

import type { SupabaseClient } from "npm:@supabase/supabase-js";

/**
 * 認証ユーザー情報の型定義
 */
export interface AuthUser {
  id: string;
}

/**
 * 認証結果の型定義
 */
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

type AuthLogger = {
  loggingWarn: (message: string, meta?: Record<string, unknown>) => void;
  loggingError: (error: unknown, meta?: Record<string, unknown>) => void;
};

/**
 * リクエストから認証ユーザー情報を取得
 * @param supabaseClient - Supabaseクライアント
 * @param token - JWTトークン
 * @returns 認証結果
 */
export async function getAuthUser(
  supabaseClient: SupabaseClient,
  token: string,
  logger?: AuthLogger,
): Promise<AuthResult> {
  try {
    const { data: claimsData, error: authError } =
      await supabaseClient.auth.getClaims(token);
    const authUserId = claimsData?.claims?.sub as string;

    if (authError || !authUserId) {
      logger?.loggingWarn("Authentication failed", {
        error: authError?.message,
      });
      return {
        success: false,
        error: "ユーザー認証に失敗しました",
      };
    }

    return {
      success: true,
      user: {
        id: authUserId,
      },
    };
  } catch (err) {
    logger?.loggingError(err, { context: "getAuthUser" });
    return {
      success: false,
      error: "認証処理中にエラーが発生しました",
    };
  }
}
