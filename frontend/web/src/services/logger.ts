// src/services/logger.ts
// Next.js（Server Actions / Route Handlers）向けの軽量な構造化ロガー

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

type LogMeta = {
  action?: string;
  [key: string]: unknown;
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
    const raw = process.env.MASK_TARGETS;
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

/**
 * 構造化ロガーを作成
 * リクエストごとに一意のrequestIdを生成し、ログの追跡を可能にする
 *
 * @param actionName アクション名（Server Actions名やRoute名など）
 * @returns ロガーインスタンス
 */
export function createLogger(actionName?: string) {
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();

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
      ...(actionName ? { action: actionName } : {}),
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
   * @param meta 追加のメタデータ
   */
  function start(meta?: LogMeta) {
    log("info", "action_start", meta);
  }

  /**
   * 処理終了ログを出力（処理時間を含む）
   *
   * @param meta 成否やエラーメッセージなど
   */
  function end(meta?: { success: boolean; errorMessage?: string }) {
    const endedAt = performance.now();
    const durationMs = Math.max(0, Math.round(endedAt - startedAt));
    log("info", "action_end", {
      success: meta?.success ?? true,
      durationMs,
      ...(meta?.errorMessage ? { errorMessage: meta.errorMessage } : {}),
    });
  }

  /**
   * エラーログを出力
   *
   * @param err エラーオブジェクト
   * @param meta 追加のメタデータ
   */
  function error(err: unknown, meta?: Record<string, unknown>) {
    const serialized = safeSerializeError(err);
    log("error", "error", { ...meta, error: serialized });
  }

  /**
   * 情報ログを出力
   *
   * @param message メッセージ
   * @param meta 追加のメタデータ
   */
  function info(message: string, meta?: Record<string, unknown>) {
    log("info", message, meta);
  }

  /**
   * 警告ログを出力
   *
   * @param message メッセージ
   * @param meta 追加のメタデータ
   */
  function warn(message: string, meta?: Record<string, unknown>) {
    log("warn", message, meta);
  }

  return {
    start,
    end,
    error,
    info,
    warn,
    requestId,
  };
}
