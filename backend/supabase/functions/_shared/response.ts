// ========================================
// レスポンスヘルパーユーティリティ
// ========================================

/**
 * 標準レスポンスの型定義
 */
export interface StandardResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * JSONレスポンスを作成
 * @param data - レスポンスデータ（StandardResponse 形式以外の任意のJSON互換オブジェクトも可）
 * @param status - HTTPステータスコード
 * @returns Response
 */
export function createJsonResponse<TBody = unknown>(
  data: TBody,
  status: number = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * 成功レスポンスを作成
 * @param data - レスポンスデータ
 * @param status - HTTPステータスコード（デフォルト: 200）
 * @returns Response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
): Response {
  return createJsonResponse({ success: true, data }, status);
}

/**
 * エラーレスポンスを作成
 * @param error - エラーメッセージ
 * @param status - HTTPステータスコード
 * @returns Response
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
): Response {
  return createJsonResponse({ success: false, error }, status);
}

/**
 * メソッド不許可レスポンスを作成
 * @returns Response
 */
export function createMethodNotAllowedResponse(): Response {
  return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed");
}

/**
 * 認証エラーレスポンスを作成
 * @param error - エラーメッセージ
 * @returns Response
 */
export function createAuthErrorResponse(
  error: string = "認証トークンがありません",
): Response {
  return errorResponse(401, "AUTH_ERROR", error);
}

// ========================================
// テンプレートパターン用レスポンスヘルパー
// ========================================

/**
 * 成功レスポンス（テンプレートパターン用）
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  return createJsonResponse({ success: true, data }, status);
}

/**
 * エラーレスポンス（テンプレートパターン用）
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}
