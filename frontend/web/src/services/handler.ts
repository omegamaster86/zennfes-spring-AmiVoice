/**
 * Server Action 共通ハンドラー
 * バックエンドの _shared/handler.ts に対応するフロントエンド版
 *
 * start → validate → ビジネスロジック → end の流れを強制する
 */
import type { ZodType } from "zod";
import { createLogger } from "@/services/logger";

// ========================================
// エラークラス（バックエンドの ValidationError / RpcError に対応）
// ========================================

/**
 * callEdgeFunction やビジネスロジックが throw する既知エラー
 * handler がキャッチしたとき logger.error() は呼ばない（呼び出し元で記録済み）
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * フォームバリデーション失敗を表す既知エラー
 * fieldErrors を onError コールバックへ引き渡すために使用する
 */
export class FormValidationError extends ActionError {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]>,
  ) {
    super(message);
    this.name = "FormValidationError";
  }
}

// ========================================
// validate（バックエンドの ctx.validate に対応）
// ========================================

/**
 * フォームデータを Zod スキーマで検証して返す
 * バックエンドの ctx.validate(schema) に対応するフロントエンド版
 *
 * @param schema 検証に使用する Zod スキーマ
 * @param data 検証対象データ
 * @param logger 警告ログの出力先
 * @returns バリデーション済みデータ（失敗時は FormValidationError を throw）
 */
export function validate<T>(
  schema: ZodType<T>,
  data: unknown,
  logger: ReturnType<typeof createLogger>,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0] as string;
      fieldErrors[path] ??= [];
      fieldErrors[path].push(issue.message);
    }
    logger.warn("validation_failed", { fieldErrors });
    throw new FormValidationError("入力内容が不正です", fieldErrors);
  }
  return result.data;
}

// ========================================
// success / actionError（バックエンドの ctx.success() / ctx.error() に対応）
// ========================================

/**
 * Server Action の成功レスポンスを生成する
 * バックエンドの ctx.success(data) に対応するフロントエンド版
 */
export function success(message: string): { success: true; message: string } {
  return { success: true, message };
}

/**
 * Server Action のエラーレスポンスを生成する
 * バックエンドの ctx.error() に対応するフロントエンド版
 *
 * - FormValidationError の場合は fieldErrors を含める
 * - ActionError の場合は error.message を使用
 * - それ以外は汎用メッセージを使用
 */
export function actionError(
  error: unknown,
  payload?: FormData,
): {
  success: false;
  message: string;
  payload?: FormData;
  fieldErrors?: Record<string, string[]>;
} {
  if (error instanceof FormValidationError) {
    return {
      success: false,
      message: error.message,
      payload,
      fieldErrors: error.fieldErrors,
    };
  }
  return {
    success: false,
    message:
      error instanceof ActionError
        ? error.message
        : "予期しないエラーが発生しました",
    payload,
  };
}

// ========================================
// handler（バックエンドの handler() に対応）
// ========================================

/**
 * Server Action のエントリポイントを生成する
 * createLogger / logger.start / try-catch / logger.end の
 * 定型コードをカプセル化し、ビジネスロジックだけを書けばよい形にする
 *
 * ログ規約:
 *   - start・成功時 end・catch 時 end はこの関数が担う
 *   - ビジネス固有の info / warn ログは fn 内で担う
 *
 * @param actionName ロガー名（createLogger に渡す値）
 * @param fn ビジネスロジック。引数として logger を受け取る
 * @param options startMeta / onError
 * @returns fn の戻り値、または例外時に onError の戻り値
 */
export async function handler<T>(
  actionName: string,
  fn: (logger: ReturnType<typeof createLogger>) => Promise<T>,
  options: {
    /** logger.start() に渡すメタデータ */
    startMeta?: Record<string, unknown>;
    /**
     * 例外発生時に返すフォールバック値を返す関数
     * error を受け取るので FormValidationError などで分岐できる
     */
    onError: (error: unknown) => T;
  },
): Promise<T> {
  const logger = createLogger(actionName);
  logger.start(options.startMeta);
  try {
    const result = await fn(logger);
    logger.end({ success: true });
    return result;
  } catch (error) {
    if (error instanceof ActionError) {
      // callEdgeFunction 等で記録済みなので logger.error は呼ばない
      logger.end({ success: false, errorMessage: error.message });
    } else {
      logger.error(error, { context: actionName });
      logger.end({
        success: false,
        errorMessage: "予期しないエラーが発生しました",
      });
    }
    return options.onError(error);
  }
}
