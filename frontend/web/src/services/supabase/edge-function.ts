/**
 * Edge Function 共通呼び出しユーティリティ
 *
 * 認証・セッション取得・fetch・レスポンスバリデーションの
 * 共通フローをカプセル化する。
 * 呼び出し側はビジネスロジックだけを書けばよい。
 *
 * ログ規約:
 *   - インフラ起因のエラー（認証/HTTP/バリデーション失敗）は
 *     この関数内でログを記録したうえで ActionError を throw する。
 *   - logger.end() は呼び出し元の handler が管理する。
 */
import { type ZodType, z } from "zod";
import { ActionError } from "@/services/handler";
import type { createLogger } from "@/services/logger";
import { createClient } from "@/services/supabase/server";

/**
 * Supabase Edge Function を呼び出してデータを返す
 *
 * @param functionName Edge Function 名（例: "get-todos"）
 * @param dataSchema 成功時のレスポンス data フィールドを検証する Zod スキーマ
 * @param options method / body / logger
 * @returns 検証済みの data（失敗時は ActionError を throw）
 */
export async function callEdgeFunction<T>(
  functionName: string,
  dataSchema: ZodType<T>,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    logger: ReturnType<typeof createLogger>;
  },
): Promise<T> {
  const { method = "GET", body, logger } = options;

  const supabase = await createClient();

  // セッション取得（アクセストークンをEdge Function呼び出しとJWT検証に使用）
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    logger.warn("session_not_found");
    throw new ActionError("セッションが見つかりません");
  }

  // JWTクレームからユーザーIDを取得（ネットワーク呼び出し不要）
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims(session.access_token);
  const authUserId = claimsData?.claims?.sub as string | undefined;

  if (claimsError || !authUserId) {
    logger.error(claimsError, { context: "authentication" });
    throw new ActionError("認証に失敗しました");
  }

  logger.info("user_authenticated", { userId: authUserId });

  // 環境変数チェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    logger.error(new Error("NEXT_PUBLIC_SUPABASE_URL is not set"), {
      context: "config",
    });
    throw new ActionError("サーバー設定エラー");
  }

  logger.info("edge_function_call_start", { function: functionName, method });

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${session.access_token}`,
      "X-Request-ID": logger.requestId,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    logger.error(new Error(`Edge Function failed: ${response.statusText}`), {
      context: "edge_function",
      status: response.status,
      statusText: response.statusText,
    });
    throw new ActionError("サーバーエラーが発生しました");
  }

  logger.info("edge_function_call_completed", { status: response.status });

  const jsonData: unknown = await response.json();

  // 標準レスポンス形式 { success: true, data: T } | { success: false, error: string }
  const responseSchema = z.union([
    z.object({ success: z.literal(true), data: dataSchema }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]);

  const validationResult = responseSchema.safeParse(jsonData);
  if (!validationResult.success) {
    logger.error(validationResult.error, { context: "response_validation" });
    throw new ActionError("レスポンスの形式が不正です");
  }

  const responseData = validationResult.data;

  if (!responseData.success) {
    logger.warn("api_business_error", { error: responseData.error });
    throw new ActionError(responseData.error);
  }

  return responseData.data;
}
