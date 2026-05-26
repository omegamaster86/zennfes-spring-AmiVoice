/**
 * LINE Login (OIDC) 用のユーティリティ
 *
 * - authorize URL の構築
 * - 認可コードのトークン交換 (access_token / id_token 取得)
 * - id_token の検証 (LINE 公式 /oauth2/v2.1/verify を利用)
 *
 * サーバーサイドからのみ呼び出されることを想定しています。
 */

import "server-only";

const LINE_AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

const DEFAULT_SCOPE = "openid profile email";

/** コールバックのパス (middleware の PUBLIC_PATHS でカバーされる `/auth/callback` 配下) */
export const LINE_CALLBACK_PATH = "/auth/callback/line";

/** state / nonce 保存用 Cookie 名 */
export const LINE_STATE_COOKIE = "line_oauth_state";
export const LINE_NONCE_COOKIE = "line_oauth_nonce";

/** state / nonce Cookie の TTL (秒) */
export const LINE_OAUTH_COOKIE_TTL_SEC = 300;

/**
 * LINE からのリダイレクト URI を解決する。
 * - `LINE_REDIRECT_URI` が設定されていればそれを優先
 * - 無ければリクエストの origin + `/auth/callback/line`
 */
export function resolveRedirectUri(origin: string): string {
  const configured = process.env.LINE_REDIRECT_URI;
  if (configured && configured.length > 0) {
    return configured;
  }
  return `${origin}${LINE_CALLBACK_PATH}`;
}

export type LineTokenResponse = {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  scope: string;
  token_type: "Bearer";
};

export type LineIdTokenPayload = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
  amr?: string[];
  name?: string;
  picture?: string;
  email?: string;
};

function getChannelConfig() {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    throw new Error(
      "Missing LINE channel environment variables. Please check LINE_CHANNEL_ID and LINE_CHANNEL_SECRET.",
    );
  }

  return { channelId, channelSecret };
}

/**
 * LINE の認可エンドポイントへのリダイレクト先 URL を構築する
 */
export function buildAuthorizeUrl(params: {
  state: string;
  nonce: string;
  redirectUri: string;
  scope?: string;
}): string {
  const { channelId } = getChannelConfig();
  const url = new URL(LINE_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", channelId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", params.scope ?? DEFAULT_SCOPE);
  url.searchParams.set("nonce", params.nonce);
  return url.toString();
}

/**
 * 認可コードをアクセストークン / ID トークンに交換する
 */
export async function exchangeCodeForTokens(params: {
  code: string;
  redirectUri: string;
}): Promise<LineTokenResponse> {
  const { channelId, channelSecret } = getChannelConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: channelId,
    client_secret: channelSecret,
  });

  const res = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as LineTokenResponse;
}

/**
 * LINE の `/oauth2/v2.1/verify` エンドポイントを利用して id_token を検証する。
 * - client_id (aud)
 * - nonce
 * - 署名 / 有効期限
 * を LINE 側で検証してくれる。
 */
export async function verifyIdToken(params: {
  idToken: string;
  nonce: string;
}): Promise<LineIdTokenPayload> {
  const { channelId } = getChannelConfig();

  const body = new URLSearchParams({
    id_token: params.idToken,
    client_id: channelId,
    nonce: params.nonce,
  });

  const res = await fetch(LINE_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE id_token verify failed: ${res.status} ${text}`);
  }

  const payload = (await res.json()) as LineIdTokenPayload;

  if (!payload.sub) {
    throw new Error("LINE id_token payload missing sub");
  }

  return payload;
}

/**
 * LINE の `sub` (LINE ユーザー ID) からプレースホルダ email を生成する
 */
export function buildPlaceholderEmail(sub: string): string {
  return `line_${sub}@line.local`;
}
