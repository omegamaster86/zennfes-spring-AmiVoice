// ========================================
// バリデーションユーティリティ
// ========================================

/**
 * リクエストメソッドを検証
 * @param req - Request
 * @param allowedMethods - 許可するメソッドの配列
 * @returns 許可されている場合true
 */
export function validateMethod(
  req: Request,
  allowedMethods: string[],
): boolean {
  return allowedMethods.includes(req.method);
}

/**
 * Authorizationヘッダーを取得
 * @param req - Request
 * @returns Authorizationヘッダーの値（存在しない場合はnull）
 */
export function getAuthHeader(req: Request): string | null {
  return req.headers.get("Authorization");
}
