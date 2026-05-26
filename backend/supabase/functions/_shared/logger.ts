// supabase/functions/_shared/logger.ts
// Supabase Edge Functions（Deno）向けの軽量な構造化ロガー
// requestId によるリクエスト相関と簡便な出力メソッドを提供します

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

type StartMeta = {
  function?: string;
};

type EndMeta = {
  errorMessage?: string;
};

// マスキング対象のキー（環境変数で上書き可能）
function loadMaskTargetsFromEnv(): Set<string> {
  const fallback = [
    "password",
    "pass",
    "pwd",
    "email",
    "lastName",
    "firstName",
    "postalCode1",
    "postalCode2",
    "prefecture",
    "city",
    "address",
    "building",
    "phone",
    "tel",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "auth",
    "jwt",
  ];
  try {
    const raw = Deno.env.get("MASK_TARGETS");
    if (!raw) return new Set(fallback);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const keys = parsed.filter((v) => typeof v === "string");
      return new Set(keys.length > 0 ? keys : fallback);
    }
    return new Set(fallback);
  } catch {
    return new Set(fallback);
  }
}

const SENSITIVE_KEYS = loadMaskTargetsFromEnv();

function maskSensitiveData<T extends Record<string, unknown>>(
  obj: T,
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (SENSITIVE_KEYS.has(k)) {
      result[k] = "***";
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      result[k] = maskSensitiveData(v as Record<string, unknown>);
    } else if (Array.isArray(v)) {
      result[k] = v.map((item) =>
        typeof item === "object" && item !== null
          ? maskSensitiveData(item as Record<string, unknown>)
          : (item as JsonValue),
      ) as JsonValue;
    } else {
      result[k] = (v as JsonValue) ?? null;
    }
  }
  return result;
}

function pickRequestInfo(req: Request) {
  const urlObj = new URL(req.url);
  const method = req.method;
  const path = urlObj.pathname;
  const searchParams: Record<string, string> = {};
  for (const [k, v] of urlObj.searchParams.entries()) {
    searchParams[k] = v;
  }
  const userAgent = req.headers.get("user-agent") ?? "";
  const contentType = req.headers.get("content-type") ?? "";
  const hasAuthorization = !!req.headers.get("authorization");
  const acceptLanguage = req.headers.get("accept-language") ?? "";
  return {
    method,
    path,
    query: searchParams,
    headers: {
      userAgent,
      contentType,
      authorizationPresent: hasAuthorization,
      acceptLanguage,
    },
  };
}

function safeSerializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  try {
    return typeof err === "object"
      ? maskSensitiveData((err as Record<string, unknown>) ?? {})
      : { message: String(err) };
  } catch {
    return { message: "Unknown error" };
  }
}

// JWT ペイロードから userId（sub クレーム）をローカルデコードで取得
// ロギング用途のため検証は不要（認証は handler 側で実施済み）
function extractUserIdFromJwt(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !/^Bearer\s+/.test(authHeader)) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function createRequestLogger(req: Request) {
  const requestId =
    req.headers.get("x-request-id") ??
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2);
  const startedAt = globalThis.performance?.now
    ? globalThis.performance.now()
    : Date.now();
  const base = pickRequestInfo(req);
  const userId = extractUserIdFromJwt(req);

  function log(
    level: "info" | "warn" | "error" | "log",
    message: string,
    extra?: Record<string, unknown>,
  ) {
    const maskedExtra =
      extra && typeof extra === "object"
        ? maskSensitiveData(extra as Record<string, unknown>)
        : undefined;
    const payload = {
      level,
      ts: new Date().toISOString(),
      requestId,
      method: base.method,
      path: base.path,
      ...(userId ? { userId } : {}),
      ...(maskedExtra ?? {}),
      message,
    } as Record<string, unknown>;

    try {
      const out = JSON.stringify(payload);
      switch (level) {
        case "error":
          console.error(out);
          break;
        case "warn":
          console.warn(out);
          break;
        case "info":
          console.info(out);
          break;
        default:
          console.log(out);
      }
    } catch {
      const fallback = `[${level}] ${message} requestId=${requestId}`;
      switch (level) {
        case "error":
          console.error(fallback);
          break;
        case "warn":
          console.warn(fallback);
          break;
        case "info":
          console.info(fallback);
          break;
        default:
          console.log(fallback);
      }
    }
  }

  /**
   * 処理開始ログを出力
   *
   * @param meta 追加のメタデータ（関数名など）
   * @param bodyOrQuery リクエストボディやクエリパラメータ
   */
  function loggingStart(
    meta?: StartMeta,
    bodyOrQuery?: { body?: unknown; query?: Record<string, unknown> },
  ) {
    const query =
      (bodyOrQuery?.query as Record<string, unknown>) || base.query || {};
    const body =
      bodyOrQuery?.body && typeof bodyOrQuery.body === "object"
        ? (bodyOrQuery.body as Record<string, unknown>)
        : undefined;
    log("info", "request_start", {
      ...meta,
      request: {
        method: base.method,
        path: base.path,
        headers: base.headers,
        query,
        body,
      },
    });
  }

  /**
   * 処理終了ログを出力（処理時間を含む）
   *
   * @param status HTTPステータスコード
   * @param meta エラーメッセージなど
   */
  function loggingEnd(status: number, meta?: EndMeta) {
    const endedAt = globalThis.performance?.now
      ? globalThis.performance.now()
      : Date.now();
    const durationMs = Math.max(0, Math.round(endedAt - startedAt));
    log("info", "request_end", {
      status,
      durationMs,
      ...(meta?.errorMessage ? { errorMessage: meta.errorMessage } : {}),
    });
  }

  /**
   * エラーログを出力
   *
   * @param error エラーオブジェクト
   * @param meta 追加のメタデータ
   */
  function loggingError(error: unknown, meta?: Record<string, unknown>) {
    const serialized = safeSerializeError(error);
    log("error", "error", { ...meta, error: serialized });
  }

  /**
   * 情報ログを出力
   *
   * @param message メッセージ
   * @param meta 追加のメタデータ
   */
  function loggingInfo(message: string, meta?: Record<string, unknown>) {
    log("info", message, meta);
  }

  /**
   * 警告ログを出力
   *
   * @param message メッセージ
   * @param meta 追加のメタデータ
   */
  function loggingWarn(message: string, meta?: Record<string, unknown>) {
    log("warn", message, meta);
  }

  return {
    requestId,
    loggingStart,
    loggingEnd,
    loggingError,
    loggingInfo,
    loggingWarn,
  };
}
