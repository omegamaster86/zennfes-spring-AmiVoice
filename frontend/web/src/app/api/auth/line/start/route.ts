import { type NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  LINE_NONCE_COOKIE,
  LINE_OAUTH_COOKIE_TTL_SEC,
  LINE_STATE_COOKIE,
  resolveRedirectUri,
} from "@/services/line/oauth";
import { createLogger } from "@/services/logger";

/**
 * LINE ログイン開始エンドポイント
 *
 * - state / nonce を生成して httpOnly Cookie に保存
 * - LINE の認可エンドポイント (`/oauth2/v2.1/authorize`) へ 302 リダイレクト
 */
export async function GET(request: NextRequest) {
  const logger = createLogger("auth/line/start");

  try {
    const origin = request.nextUrl.origin;
    const redirectUri = resolveRedirectUri(origin);

    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    const authorizeUrl = buildAuthorizeUrl({ state, nonce, redirectUri });

    logger.info("line_authorize_redirect", { redirectUri });

    const response = NextResponse.redirect(authorizeUrl);

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
      maxAge: LINE_OAUTH_COOKIE_TTL_SEC,
    };

    response.cookies.set(LINE_STATE_COOKIE, state, cookieOptions);
    response.cookies.set(LINE_NONCE_COOKIE, nonce, cookieOptions);

    return response;
  } catch (error) {
    logger.error(error, { context: "line_authorize_redirect" });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=line_start_error";
    return NextResponse.redirect(url);
  }
}
