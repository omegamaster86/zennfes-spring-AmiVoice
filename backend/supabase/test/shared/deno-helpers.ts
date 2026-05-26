/**
 * Deno/Supabase Functions専用ヘルパー関数
 *
 * このファイルはDenoランタイムでのみ使用可能です。
 * Edge Functionのテストに必要なリクエスト送信やアサーション関数を提供します。
 */

import { assert, assertEquals } from "@std/assert";

/**
 * Supabase環境変数の設定
 */
export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

/**
 * 環境変数からSupabase設定を取得
 * @returns Supabaseの設定
 * @throws 環境変数が設定されていない場合
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!url) {
    throw new Error("SUPABASE_URL environment variable is not set.");
  }

  if (!publishableKey) {
    throw new Error(
      "SUPABASE_PUBLISHABLE_KEY environment variable is not set.",
    );
  }

  return { url, publishableKey };
}

/**
 * Edge Functionのエンドポイントを構築
 * @param functionName - 関数名
 * @returns エンドポイントURL
 */
export function buildEndpointUrl(functionName: string): string {
  const { url } = getSupabaseConfig();
  return `${url}/functions/v1/${functionName}`;
}

// Supabase Edge Functions の Worker は lazy boot のため、同一 Function に対する
// 初回リクエストが boot 完了前に到達すると `503 BOOT_ERROR` が返ることがある。
// テストでは 503 を期待するケースが無いため、503 が返ったら短い待機を挟んで
// 同じリクエストを 1 回だけ再送し、コールドスタート起因のフレークを抑止する。
const BOOT_RETRY_MAX = 1;
const BOOT_RETRY_DELAY_MS = 300;

async function fetchWithBootRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let response = await fetch(url, init);
  for (let attempt = 0; attempt < BOOT_RETRY_MAX; attempt++) {
    if (response.status !== 503) break;
    // body を読み切ってからリトライしないとコネクションがリークする可能性があるため、
    // ここで明示的に消費する（内容自体は使わない）。
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, BOOT_RETRY_DELAY_MS));
    response = await fetch(url, init);
  }
  return response;
}

/**
 * Edge Functionにリクエストを送信
 * @param functionName - 関数名
 * @param method - HTTPメソッド（GET, POST, PUT, DELETE, OPTIONS等）
 * @param body - リクエストボディ（オプション）
 * @param headers - 追加ヘッダー（オプション）
 * @returns レスポンス
 */
export async function makeRequest(
  functionName: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  const { publishableKey } = getSupabaseConfig();
  const endpointUrl = buildEndpointUrl(functionName);

  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${publishableKey}`,
    ...headers,
  };

  const response = await fetchWithBootRetry(endpointUrl, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  return response;
}

/**
 * 生のボディでEdge Functionにリクエストを送信
 * （無効なJSONやカスタムボディのテスト用）
 * @param functionName - 関数名
 * @param method - HTTPメソッド（GET, POST, PUT, DELETE, OPTIONS等）
 * @param rawBody - 生のリクエストボディ
 * @param headers - 追加ヘッダー（オプション）
 * @returns レスポンス
 */
export async function makeRawRequest(
  functionName: string,
  method: string,
  rawBody?: string | FormData | Blob,
  headers: Record<string, string> = {},
): Promise<Response> {
  const { publishableKey } = getSupabaseConfig();
  const endpointUrl = buildEndpointUrl(functionName);

  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${publishableKey}`,
    ...headers,
  };

  const response = await fetchWithBootRetry(endpointUrl, {
    method,
    headers: requestHeaders,
    body: rawBody,
  });

  return response;
}

/**
 * 200以外のレスポンスの詳細をログ出力し、500エラーの場合はエラーをスロー
 * @param response - レスポンス
 * @throws 500エラーの場合
 */
export async function logNon200Response(response: Response): Promise<void> {
  // 200以外のレスポンスの場合はすべてconsole.errorを出力
  if (response.status !== 200) {
    let errorMessage = `${response.status}エラーが発生しました`;
    try {
      const errorData = await response.json();
      console.error(`${response.status}エラーの詳細:`, errorData);
      errorMessage = `${response.status}エラーが発生しました: ${
        errorData.error || "Unknown error"
      }`;
    } catch {
      const errorText = await response.text();
      console.error(`${response.status}エラーの詳細（テキスト）:`, errorText);
      errorMessage = `${response.status}エラーが発生しました: ${errorText}`;
    }

    // 500エラーの場合はエラーをスロー
    if (response.status === 500) {
      throw new Error(errorMessage);
    }
  } else {
    // 200の場合もクローンされたレスポンスのボディを完全に読み取って消費する
    await response.arrayBuffer();
  }
}

/**
 * 成功レスポンス（200 OK）を検証
 * @param response - レスポンス
 */
export function assertSuccessResponse(response: Response): void {
  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("content-type")?.includes("application/json"),
    true,
  );
}

/**
 * CORSヘッダーを検証
 * @param response - レスポンス
 */
export function assertCorsHeaders(response: Response): void {
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
}

/**
 * レスポンス時間を計測してリクエストを実行
 * @param functionName - 関数名
 * @param method - HTTPメソッド
 * @param body - リクエストボディ（オプション）
 * @param headers - 追加ヘッダー（オプション）
 * @returns レスポンスとレスポンス時間
 */
export async function makeRequestWithTiming(
  functionName: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<{ response: Response; responseTime: number }> {
  const startTime = Date.now();
  const response = await makeRequest(functionName, method, body, headers);
  const endTime = Date.now();
  const responseTime = endTime - startTime;

  return { response, responseTime };
}

/**
 * レスポンス時間が指定時間以内であることを検証
 * @param responseTime - レスポンス時間（ミリ秒）
 * @param maxTime - 最大許容時間（ミリ秒）
 */
export function assertResponseTime(
  responseTime: number,
  maxTime: number,
): void {
  assert(
    responseTime < maxTime,
    `Response time too slow: ${responseTime}ms (max: ${maxTime}ms)`,
  );
}

/**
 * エラーレスポンスを検証
 *
 * Edge Function の標準エラー形式: `{ success: false, error: { code, message } }`
 * @param response - レスポンス
 * @param expectedStatus - 期待されるステータスコード
 * @param expectedErrorMessage - 期待されるエラーメッセージ（`error.message` と比較）。
 *   旧形式（`error` が文字列）にも後方互換で対応する。
 */
export async function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedErrorMessage?: string,
): Promise<void> {
  assertEquals(response.status, expectedStatus);

  if (expectedErrorMessage) {
    const data = await response.json();
    if (
      data.error !== null &&
      typeof data.error === "object" &&
      "message" in data.error
    ) {
      assertEquals(data.error.message, expectedErrorMessage);
    } else {
      assertEquals(data.error, expectedErrorMessage);
    }
  } else {
    // メッセージ検証が無い場合もレスポンスボディを必ず消費してリーク検知を回避する
    await response.body?.cancel();
  }
}

/**
 * 成功レスポンスの DTO 形状（必須キー）を検証
 *
 * Edge Function の標準成功形式: `{ success: true, data: <DTO> }` を前提に、
 * `data` フィールドが object であり、指定した必須キーを全て含むことを検証する。
 * `data` が配列の場合は、各要素について同様の検証を行う。
 *
 * 観点ガイドライン #9（契約 / Contract）対応のヘルパー。
 * テストでは「期待値の比較」とは別に「DTO の形状そのもの」を固定する用途で使う。
 *
 * @param payload - パース済みのレスポンス本体（`await response.json()` の戻り値）
 * @param requiredKeys - `data` 上で必ず存在すべきキーの配列
 *
 * @example
 * const payload = await response.json();
 * assertSuccessShape(payload, ["id", "title", "status", "priority"]);
 */
export function assertSuccessShape(
  payload: unknown,
  requiredKeys: readonly string[],
): void {
  assert(
    typeof payload === "object" && payload !== null,
    "payload は object であるべき",
  );
  const obj = payload as { success?: unknown; data?: unknown };
  assertEquals(obj.success, true, "success は true であるべき");
  assert(obj.data !== undefined, "data フィールドが存在するべき");

  const items = Array.isArray(obj.data) ? obj.data : [obj.data];
  for (const [idx, item] of items.entries()) {
    assert(
      typeof item === "object" && item !== null,
      `data[${idx}] は object であるべき`,
    );
    const record = item as Record<string, unknown>;
    for (const key of requiredKeys) {
      assert(
        key in record,
        `data[${idx}] に必須キー "${key}" が含まれるべき（実際: ${
          Object.keys(
            record,
          ).join(", ")
        }）`,
      );
    }
  }
}

/**
 * エラーレスポンスの DTO 形状（必須キー）を検証
 *
 * Edge Function の標準エラー形式: `{ success: false, error: { code, message } }` を前提に、
 * `success: false` であり、`error.code` / `error.message` が必ず存在することを検証する。
 *
 * 観点ガイドライン #5（エラー設計）/ #9（契約）対応のヘルパー。
 *
 * @param payload - パース済みのレスポンス本体（`await response.json()` の戻り値）
 * @param expected - 期待値（任意指定）
 *   - `code`: `error.code` の期待値（完全一致）
 *   - `messageIncludes`: `error.message` に含まれることを期待する部分文字列
 *
 * @example
 * const payload = await response.json();
 * assertErrorShape(payload, { code: "VALIDATION_ERROR" });
 */
export function assertErrorShape(
  payload: unknown,
  expected: { code?: string; messageIncludes?: string } = {},
): void {
  assert(
    typeof payload === "object" && payload !== null,
    "payload は object であるべき",
  );
  const obj = payload as { success?: unknown; error?: unknown };
  assertEquals(obj.success, false, "success は false であるべき");
  assert(
    typeof obj.error === "object" && obj.error !== null,
    "error フィールドは object であるべき",
  );
  const err = obj.error as Record<string, unknown>;
  assert("code" in err, 'error に必須キー "code" が含まれるべき');
  assert("message" in err, 'error に必須キー "message" が含まれるべき');
  assertEquals(typeof err.code, "string", "error.code は string であるべき");
  assertEquals(
    typeof err.message,
    "string",
    "error.message は string であるべき",
  );

  if (expected.code !== undefined) {
    assertEquals(err.code, expected.code);
  }
  if (expected.messageIncludes !== undefined) {
    assert(
      typeof err.message === "string" &&
        err.message.includes(expected.messageIncludes),
      `error.message に "${expected.messageIncludes}" が含まれるべき: ${err.message}`,
    );
  }
}
