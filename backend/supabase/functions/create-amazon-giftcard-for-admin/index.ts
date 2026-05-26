// ========================================
// Edge Function: create-amazon-giftcard-for-admin
// Amazon Incentives API (AGCOD) を 1 件だけ呼び出してギフト券を発行する最小実装
//
// 重要:
//   - 本関数は verify_jwt = false で公開する（config.toml 参照）
//   - 認証は `x-cron-key` ヘッダで実施する（管理者バッチ / 外部スケジューラ前提）
//   - DB 永続化・通知・バッチループ等の業務要件は含まない。
//     呼び出し元側でレコード管理・通知などを行うこと。
// ========================================

import {
  createAmazonGiftCard,
  loadAmazonGiftCardConfig,
  toAmzDate,
} from "../_shared/amazon-gift.ts";
import { createRequestLogger } from "../_shared/logger.ts";
import { createJsonResponse, errorResponse } from "../_shared/response.ts";
import { createAmazonGiftcardSchema } from "../_shared/schemas/create-amazon-giftcard-schema.ts";

/**
 * Amazon の creationRequestId 制約（英数字 40 文字以内）に収めた一意 ID を生成する。
 * UUID v4 の `-` を除去して 32 文字としたものをそのまま使う。
 */
function generateCreationRequestId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

Deno.serve(async (req) => {
  const logger = createRequestLogger(req);
  logger.loggingStart({ function: "create-amazon-giftcard-for-admin" });

  if (req.method !== "POST") {
    logger.loggingWarn("invalid method", { method: req.method });
    logger.loggingEnd(405);
    return errorResponse(405, "METHOD_NOT_ALLOWED", "POST only");
  }

  const cronKey = Deno.env.get("CRON_KEY");
  const requestCronKey = req.headers.get("x-cron-key");
  if (!cronKey || requestCronKey !== cronKey) {
    logger.loggingWarn("cron_key_mismatch", { hasCronKeyEnv: !!cronKey });
    logger.loggingEnd(401);
    return errorResponse(401, "UNAUTHORIZED", "invalid cron key");
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch (err) {
    logger.loggingWarn("invalid json", {
      error: err instanceof Error ? err.message : String(err),
    });
    logger.loggingEnd(400);
    return errorResponse(400, "BAD_REQUEST", "invalid JSON body");
  }

  const parsed = createAmazonGiftcardSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    logger.loggingWarn("validation error", { error: message });
    logger.loggingEnd(400);
    return errorResponse(400, "VALIDATION_ERROR", message);
  }

  const configResult = loadAmazonGiftCardConfig();
  if (!configResult.ok) {
    logger.loggingError(new Error("missing amazon env"), {
      missing: configResult.missing,
    });
    logger.loggingEnd(500);
    return errorResponse(
      500,
      "CONFIG_ERROR",
      `Amazon API の環境変数が不足しています: ${configResult.missing.join(", ")}`,
    );
  }

  const creationRequestId =
    parsed.data.creationRequestId ?? generateCreationRequestId();
  const requestAmzDate = toAmzDate(new Date());

  logger.loggingInfo("amazon_request_start", {
    amount: parsed.data.amount,
    currencyCode: parsed.data.currencyCode,
    creationRequestId,
  });

  let result: Awaited<ReturnType<typeof createAmazonGiftCard>>;
  try {
    result = await createAmazonGiftCard({
      config: configResult.config,
      creationRequestId,
      currencyCode: parsed.data.currencyCode,
      amount: parsed.data.amount,
      requestAmzDate,
    });
  } catch (err) {
    logger.loggingError(err, { context: "amazon_request_failed" });
    logger.loggingEnd(502);
    return errorResponse(
      502,
      "UPSTREAM_ERROR",
      "Amazon API への接続に失敗しました",
    );
  }

  logger.loggingInfo("amazon_response", {
    status: result.status,
    resultStatus: result.resultStatus ?? "unknown",
    hasClaimCode: !!result.claimCode,
  });

  // Amazon 側がエラーを返した場合は 502 にしてレスポンス内容も返す
  // （呼び出し側がリトライ可否を判断するため rawResponse をそのまま付与）
  if (
    result.status < 200 ||
    result.status >= 300 ||
    result.resultStatus !== "SUCCESS" ||
    !result.claimCode
  ) {
    logger.loggingEnd(502);
    return createJsonResponse(
      {
        success: false,
        error: {
          code: "AMAZON_API_ERROR",
          message: `Amazon API がエラーを返しました (status=${result.status}, resultStatus=${result.resultStatus ?? "unknown"})`,
        },
        data: {
          status: result.status,
          resultStatus: result.resultStatus,
          rawResponse: result.rawResponse,
        },
      },
      502,
    );
  }

  logger.loggingEnd(200);
  return createJsonResponse(
    {
      success: true,
      data: {
        creationRequestId,
        claimCode: result.claimCode,
        status: result.status,
        resultStatus: result.resultStatus,
      },
    },
    200,
  );
});
