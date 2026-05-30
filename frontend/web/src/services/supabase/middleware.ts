import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database.types";

// /**
//  * 認証不要のパス一覧（ログインリダイレクト無効化に伴い未使用）
//  */
// const PUBLIC_PATHS = [
//   "/login",
//   "/signup",
//   "/forgot-password",
//   "/reset-password",
//   "/auth/callback",
//   "/api/auth/line",
//   "/demo",
// ];

/**
 * Supabaseクライアント（ミドルウェア用）
 *
 * @param request - Next.jsリクエストオブジェクト
 * @returns レスポンスとSupabaseクライアント
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 環境変数の存在チェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // セッション取得（期限切れの場合はリフレッシュしてCookieを更新）
  await supabase.auth.getSession();

  // 未ログイン時の /login リダイレクトは無効化（トップ・音声デモ等をログインなしで利用するため）
  // let isAuthenticated = false;
  // if (session) {
  //   const { data: claimsData } = await supabase.auth.getClaims(
  //     session.access_token,
  //   );
  //   isAuthenticated = !!claimsData?.claims?.sub;
  // }
  // const pathname = request.nextUrl.pathname;
  // const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  // if (!isAuthenticated && !isPublicPath) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = "/login";
  //   url.searchParams.set("redirectedFrom", pathname);
  //   return NextResponse.redirect(url);
  // }

  return supabaseResponse;
}
