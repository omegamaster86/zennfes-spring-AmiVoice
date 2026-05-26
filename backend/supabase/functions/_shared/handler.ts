// ========================================
// Edge Function 共通ハンドラー
// start → validate → ビジネスロジック → end の流れを強制する
// ========================================

import type { ZodType } from "npm:zod";
import { getAuthUser } from "./auth.ts";
import { createRequestLogger } from "./logger.ts";
import {
  createAuthErrorResponse,
  createMethodNotAllowedResponse,
} from "./response.ts";
import { createAdminClient, createAuthenticatedClient } from "./supabase.ts";
import { getAuthHeader, validateMethod } from "./validation.ts";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class RpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RpcError";
  }
}

export class ExternalApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ExternalApiError";
  }
}

type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export type CallExternalApiOptions = {
  /** レスポンス本文の取り扱い（既定: json） */
  parseAs?: "json" | "text" | "none";
};

export interface HandlerContext {
  authUserId: string;
  validate: <T>(schema: ZodType<T>) => Promise<T>;
  callRpc: (
    name: string,
    args: Record<string, unknown>,
    options?: { admin?: boolean },
  ) => Promise<unknown>;
  /**
   * 外部サービス HTTP API を呼び出す（ログ・失敗時は ExternalApiError）
   * @param label ログ用の識別子（URL 全体を出さずに追跡する）
   */
  callExternalApi: (
    label: string,
    url: string | URL,
    init?: RequestInit,
    options?: CallExternalApiOptions,
  ) => Promise<unknown>;
  /** ビジネスロジック内から情報ログを出力する */
  log: (message: string, meta?: Record<string, unknown>) => void;
  success: <T>(data: T, status?: number) => Response;
  error: (status: number, code: string, message: string) => Response;
}

export interface HandlerOptions {
  methods?: string[];
}

/**
 * Edge Function のエントリポイントを生成する
 * メソッド検証 / 認証 / ログ開始・終了を自動で行い、
 * コールバックにはビジネスロジックだけを書けばよい
 */
export function handler(
  fn: (req: Request, ctx: HandlerContext) => Promise<Response>,
  options?: HandlerOptions,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    let internal: InternalContext;
    try {
      internal = await init(req, options);
    } catch (err) {
      const logger = createRequestLogger(req);
      logger.loggingError(err);
      logger.loggingEnd(500);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "予期しないエラーが発生しました",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if ("earlyResponse" in internal) {
      internal.logger.loggingEnd(internal.earlyResponse.status);
      return internal.earlyResponse;
    }

    const { logger, supabaseClient } = internal;
    let bodyCache: { value: unknown } | { error: string } | undefined;

    const ctx: HandlerContext = {
      authUserId: internal.authUserId,

      validate: async <T>(schema: ZodType<T>): Promise<T> => {
        if (bodyCache === undefined) {
          try {
            bodyCache = { value: await req.json() };
          } catch {
            bodyCache = { error: "Invalid JSON body" };
          }
        }

        if ("error" in bodyCache) {
          logger.loggingWarn("バリデーションエラー", {
            error: bodyCache.error,
          });
          throw new ValidationError(bodyCache.error);
        }

        const result = schema.safeParse(bodyCache.value);
        if (!result.success) {
          const msg = result.error.issues.map((i) => i.message).join(", ");
          logger.loggingWarn("バリデーションエラー", { error: msg });
          throw new ValidationError(msg);
        }
        return result.data;
      },

      callRpc: async (name, args, opts) => {
        logger.loggingInfo("RPC呼び出し", { rpc: name });
        const client = opts?.admin ? createAdminClient() : supabaseClient;
        const rpcClient = client as unknown as {
          rpc: (
            rpcName: string,
            rpcArgs: Record<string, unknown>,
          ) => Promise<RpcResult>;
        };
        const { data, error } = await rpcClient.rpc(name, args);
        if (error) {
          logger.loggingError(error, { rpc: name });
          throw new RpcError(error.message);
        }
        logger.loggingInfo("RPC成功", { rpc: name });
        return data;
      },

      callExternalApi: async (label, url, init, opts) => {
        const parseAs = opts?.parseAs ?? "json";
        logger.loggingInfo("外部API呼び出し", { label });

        let response: Response;
        try {
          response = await fetch(url, init);
        } catch (err) {
          logger.loggingError(err, { label });
          throw new ExternalApiError("外部APIへの接続に失敗しました");
        }

        if (!response.ok) {
          const snippet = await response
            .text()
            .then((t) => t.slice(0, 500))
            .catch(() => "");
          logger.loggingError(new Error(`HTTP ${response.status}`), {
            label,
            body: snippet || undefined,
          });
          throw new ExternalApiError(
            `外部APIがエラーを返しました (${response.status})`,
            response.status,
          );
        }

        if (parseAs === "none") {
          await response.arrayBuffer();
          logger.loggingInfo("外部API成功", { label });
          return undefined;
        }

        if (parseAs === "text") {
          const text = await response.text();
          logger.loggingInfo("外部API成功", { label });
          return text;
        }

        try {
          const data: unknown = await response.json();
          logger.loggingInfo("外部API成功", { label });
          return data;
        } catch (err) {
          logger.loggingError(err, { label });
          throw new ExternalApiError("外部APIのレスポンスの解析に失敗しました");
        }
      },

      log: (message: string, meta?: Record<string, unknown>) => {
        logger.loggingInfo(message, meta);
      },

      success: <T>(data: T, status: number = 200): Response => {
        logger.loggingInfo("成功レスポンス", { status });
        return new Response(JSON.stringify({ success: true, data }), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      },

      error: (status: number, code: string, message: string): Response => {
        logger.loggingWarn("エラーレスポンス", { status, code, message });
        return new Response(
          JSON.stringify({ success: false, error: { code, message } }),
          { status, headers: { "Content-Type": "application/json" } },
        );
      },
    };

    try {
      const response = await fn(req, ctx);
      logger.loggingEnd(response.status);
      return response;
    } catch (err) {
      if (err instanceof ValidationError) {
        const response = ctx.error(400, "VALIDATION_ERROR", err.message);
        logger.loggingEnd(400);
        return response;
      }
      if (err instanceof RpcError) {
        const response = ctx.error(500, "DB_ERROR", err.message);
        logger.loggingEnd(500);
        return response;
      }
      if (err instanceof ExternalApiError) {
        const response = ctx.error(502, "UPSTREAM_ERROR", err.message);
        logger.loggingEnd(502);
        return response;
      }
      logger.loggingError(err);
      const response = ctx.error(
        500,
        "INTERNAL_ERROR",
        "予期しないエラーが発生しました",
      );
      logger.loggingEnd(500);
      return response;
    }
  };
}

// ── 内部ヘルパー ──

interface InitSuccess {
  logger: ReturnType<typeof createRequestLogger>;
  authUserId: string;
  supabaseClient: ReturnType<typeof createAuthenticatedClient>;
}

interface InitEarlyReturn {
  logger: ReturnType<typeof createRequestLogger>;
  earlyResponse: Response;
}

type InternalContext = InitSuccess | InitEarlyReturn;

async function init(
  req: Request,
  options?: HandlerOptions,
): Promise<InternalContext> {
  const urlObj = new URL(req.url);
  const functionName = urlObj.pathname.split("/").filter(Boolean).pop() ?? "";
  const logger = createRequestLogger(req);

  // クローンでボディを先読み（元ストリームを消費しないため ctx.validate() に影響しない）
  let bodyForLog: Record<string, unknown> | undefined;
  if (!["GET", "HEAD"].includes(req.method)) {
    try {
      const parsed: unknown = await req.clone().json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        bodyForLog = parsed as Record<string, unknown>;
      }
    } catch {
      // JSON でない場合は無視
    }
  }

  const queryParams: Record<string, string> = {};
  urlObj.searchParams.forEach((v, k) => {
    queryParams[k] = v;
  });

  logger.loggingStart(
    { function: functionName },
    {
      body: bodyForLog,
      query: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    },
  );

  const allowedMethods = options?.methods ?? ["POST"];
  if (!validateMethod(req, allowedMethods)) {
    logger.loggingWarn("無効なHTTPメソッド", { method: req.method });
    return { logger, earlyResponse: createMethodNotAllowedResponse() };
  }

  const authHeader = getAuthHeader(req);
  if (!authHeader) {
    logger.loggingWarn("Authorizationヘッダーが見つかりません");
    return { logger, earlyResponse: createAuthErrorResponse() };
  }

  const supabaseClient = createAuthenticatedClient(authHeader);
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const authResult = await getAuthUser(supabaseClient, token, logger);
  if (!authResult.success || !authResult.user) {
    logger.loggingWarn("認証エラー", { error: authResult.error });
    return {
      logger,
      earlyResponse: createAuthErrorResponse(authResult.error),
    };
  }

  return { logger, authUserId: authResult.user.id, supabaseClient };
}
