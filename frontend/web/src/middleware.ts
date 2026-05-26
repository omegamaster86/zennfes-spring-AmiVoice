import type { NextRequest } from "next/server";
import { updateSession } from "./services/supabase/middleware";

/**
 * Next.jsミドルウェア
 * すべてのリクエストに対してSupabaseセッションを更新し、認証状態をチェック
 *
 * @param request - Next.jsリクエストオブジェクト
 * @returns レスポンス
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのリクエストパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (ファビコン)
     * - 画像ファイル (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
