import { type NextRequest, NextResponse } from "next/server";
import {
  buildPlaceholderEmail,
  exchangeCodeForTokens,
  LINE_NONCE_COOKIE,
  LINE_STATE_COOKIE,
  type LineIdTokenPayload,
  resolveRedirectUri,
  verifyIdToken,
} from "@/services/line/oauth";
import { createLogger } from "@/services/logger";
import { createAdminClient } from "@/services/supabase/admin";
import { createClient as createServerClient } from "@/services/supabase/server";

type UserResolution = {
  userId: string;
  email: string;
};

/**
 * LINE ログインコールバック
 *
 * 1. state / nonce を Cookie と照合
 * 2. 認可コードを LINE のトークンエンドポイントで id_token に交換
 * 3. id_token を検証 (LINE /verify API で client_id / nonce チェック)
 * 4. Supabase Admin でユーザーを解決 (LINE sub → email → 新規作成の順)
 * 5. magiclink の hashed_token をサーバー側で verifyOtp してセッション Cookie を確立
 * 6. 既存 create-user Edge Function を呼んで m_user を upsert
 * 7. /todos へリダイレクト
 */
export async function GET(request: NextRequest) {
  const logger = createLogger("auth/callback/line");
  const url = request.nextUrl;
  const origin = url.origin;

  const redirectToLoginWithError = (code: string) => {
    const loginUrl = url.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?error=${code}`;
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(LINE_STATE_COOKIE);
    response.cookies.delete(LINE_NONCE_COOKIE);
    return response;
  };

  const lineError = url.searchParams.get("error");
  if (lineError) {
    logger.warn("line_authorization_denied", {
      error: lineError,
      description: url.searchParams.get("error_description"),
    });
    return redirectToLoginWithError("line_denied");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get(LINE_STATE_COOKIE)?.value;
  const storedNonce = request.cookies.get(LINE_NONCE_COOKIE)?.value;

  if (!code || !state || !storedState || !storedNonce) {
    logger.warn("line_callback_missing_params", {
      hasCode: !!code,
      hasState: !!state,
      hasStoredState: !!storedState,
      hasStoredNonce: !!storedNonce,
    });
    return redirectToLoginWithError("line_invalid_request");
  }

  if (state !== storedState) {
    logger.warn("line_state_mismatch");
    return redirectToLoginWithError("line_state_mismatch");
  }

  let idTokenPayload: LineIdTokenPayload;
  try {
    const redirectUri = resolveRedirectUri(origin);
    const tokens = await exchangeCodeForTokens({ code, redirectUri });
    idTokenPayload = await verifyIdToken({
      idToken: tokens.id_token,
      nonce: storedNonce,
    });
  } catch (error) {
    logger.error(error, { context: "line_token_exchange_or_verify" });
    return redirectToLoginWithError("line_token_error");
  }

  const sub = idTokenPayload.sub;
  const lineEmail = idTokenPayload.email;
  const displayName = idTokenPayload.name;
  const picture = idTokenPayload.picture;

  let resolution: UserResolution;
  try {
    resolution = await resolveSupabaseUser({
      sub,
      lineEmail,
      displayName,
      picture,
    });
  } catch (error) {
    logger.error(error, { context: "line_user_resolution", sub });
    return redirectToLoginWithError("line_user_resolve_error");
  }

  logger.info("line_user_resolved", {
    userId: resolution.userId,
    email: resolution.email,
  });

  try {
    await establishSession(resolution.email);
  } catch (error) {
    logger.error(error, { context: "line_session_establish" });
    return redirectToLoginWithError("line_session_error");
  }

  await ensureMUser({ email: resolution.email, origin, logger });

  const response = NextResponse.redirect(`${origin}/todos`);
  response.cookies.delete(LINE_STATE_COOKIE);
  response.cookies.delete(LINE_NONCE_COOKIE);
  return response;
}

/**
 * Supabase Admin を使って LINE ユーザーを解決する
 * 優先順位:
 *   1. auth.users.app_metadata.provider_ids.line === sub の既存ユーザー
 *   2. LINE email が取れていれば email 一致の既存ユーザー (LINE を自動リンク)
 *   3. 新規作成 (email が無ければプレースホルダ)
 */
async function resolveSupabaseUser(params: {
  sub: string;
  lineEmail?: string;
  displayName?: string;
  picture?: string;
}): Promise<UserResolution> {
  const adminClient = createAdminClient();
  const { sub, lineEmail, displayName, picture } = params;

  const { data: userIdBySub, error: lookupSubError } = await adminClient.rpc(
    // biome-ignore lint/suspicious/noExplicitAny: 生成済み型に未登録の RPC を呼び出すため
    "find_auth_user_id_by_line_sub" as any,
    { p_sub: sub } as never,
  );
  if (lookupSubError) {
    throw lookupSubError;
  }

  if (userIdBySub) {
    const existingId = userIdBySub as unknown as string;
    const { data: existing, error: getErr } =
      await adminClient.auth.admin.getUserById(existingId);
    if (getErr || !existing?.user) {
      throw getErr ?? new Error("auth user not found by sub");
    }
    const email = existing.user.email ?? buildPlaceholderEmail(sub);
    return { userId: existing.user.id, email };
  }

  if (lineEmail) {
    const { data: userIdByEmail, error: lookupEmailError } =
      await adminClient.rpc(
        // biome-ignore lint/suspicious/noExplicitAny: 生成済み型に未登録の RPC を呼び出すため
        "find_auth_user_id_by_email" as any,
        { p_email: lineEmail } as never,
      );
    if (lookupEmailError) {
      throw lookupEmailError;
    }

    if (userIdByEmail) {
      const existingId = userIdByEmail as unknown as string;
      const { data: existing, error: getErr } =
        await adminClient.auth.admin.getUserById(existingId);
      if (getErr || !existing?.user) {
        throw getErr ?? new Error("auth user not found by email");
      }

      const appMeta = (existing.user.app_metadata ?? {}) as Record<
        string,
        unknown
      >;
      const providerIds =
        (appMeta.provider_ids as Record<string, string> | undefined) ?? {};
      const providers = Array.isArray(appMeta.providers)
        ? (appMeta.providers as string[])
        : [];

      const nextProviders = providers.includes("line")
        ? providers
        : [...providers, "line"];

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(
        existing.user.id,
        {
          app_metadata: {
            ...appMeta,
            provider_ids: { ...providerIds, line: sub },
            providers: nextProviders,
          },
        },
      );
      if (updateErr) {
        throw updateErr;
      }

      return {
        userId: existing.user.id,
        email: existing.user.email ?? lineEmail,
      };
    }
  }

  const email = lineEmail ?? buildPlaceholderEmail(sub);
  const { data: created, error: createErr } =
    await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: {
        provider: "line",
        providers: ["line"],
        provider_ids: { line: sub },
      },
      user_metadata: {
        name: displayName,
        picture,
      },
    });

  if (createErr || !created?.user) {
    throw createErr ?? new Error("failed to create auth user");
  }

  return { userId: created.user.id, email };
}

/**
 * サーバーサイドで magiclink の hashed_token を verifyOtp してセッション Cookie を確立する
 */
async function establishSession(email: string): Promise<void> {
  const adminClient = createAdminClient();
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw linkError ?? new Error("failed to generate magiclink");
  }

  const serverClient = await createServerClient();
  const { error: verifyError } = await serverClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError) {
    throw verifyError;
  }
}

/**
 * 既存の create-user Edge Function を呼び出して m_user を upsert する
 * セッションが確立されている前提で、ユーザー自身の JWT を Authorization に載せて呼ぶ
 */
async function ensureMUser(params: {
  email: string;
  origin: string;
  logger: ReturnType<typeof createLogger>;
}): Promise<void> {
  const { email, logger } = params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    logger.warn("create_user_skipped_no_supabase_url");
    return;
  }

  const serverClient = await createServerClient();
  const {
    data: { session },
  } = await serverClient.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    logger.warn("create_user_skipped_no_access_token");
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      logger.warn("create_user_record_failed", { status: res.status });
    } else {
      logger.info("create_user_record_success");
    }
  } catch (err) {
    logger.error(err, { context: "create_user_in_line_callback" });
  }
}
