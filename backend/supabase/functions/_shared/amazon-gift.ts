// ========================================
// Amazon Incentives API (Gift Card) 用ユーティリティ
// 純粋ロジック（SigV4 署名・XML 組立/解析）を集約し、
// Edge Function 本体からはこのモジュールを呼び出すだけで完結させる
// ========================================

export const AMAZON_SERVICE = "AGCODService";
export const AMAZON_TARGET = "com.amazonaws.agcod.AGCODService.CreateGiftCard";
export const AMAZON_CONTENT_TYPE =
  "application/x-www-form-urlencoded; charset=UTF-8";
export const AMAZON_ACCEPT = "application/x-www-form-urlencoded; charset=UTF-8";

const textEncoder = new TextEncoder();

/**
 * Date を AWS の x-amz-date 形式 (YYYYMMDDTHHMMSSZ) に変換する
 */
export function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// TextEncoder.encode は新しい ArrayBuffer を確保して返すが、
// 型ライブラリの世代によっては Uint8Array<ArrayBufferLike> として推論されてしまい
// crypto.subtle 系の BufferSource 引数と互換にならないため明示的に narrow する。
function encode(value: string): Uint8Array<ArrayBuffer> {
  return textEncoder.encode(value) as Uint8Array<ArrayBuffer>;
}

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encode(value));
  return toHex(hash);
}

async function hmacSha256(key: Uint8Array, value: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encode(value));
  return new Uint8Array(signature);
}

/**
 * AWS SigV4 の署名鍵（kDate → kRegion → kService → kSigning）を導出する
 */
async function getSignatureKey(
  secret: string,
  dateStamp: string,
  region: string,
): Promise<Uint8Array> {
  const kDate = await hmacSha256(encode(`AWS4${secret}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, AMAZON_SERVICE);
  return hmacSha256(kService, "aws4_request");
}

/**
 * CreateGiftCard XML リクエスト本文を組み立てる
 */
export function buildXmlBody(input: {
  creationRequestId: string;
  partnerId: string;
  currencyCode: string;
  amount: string;
}): string {
  return [
    "<CreateGiftCardRequest>",
    `  <creationRequestId>${input.creationRequestId}</creationRequestId>`,
    `  <partnerId>${input.partnerId}</partnerId>`,
    "  <value>",
    `    <currencyCode>${input.currencyCode}</currencyCode>`,
    `    <amount>${input.amount}</amount>`,
    "  </value>",
    "</CreateGiftCardRequest>",
  ].join("\n");
}

/**
 * 単純な XML レスポンスから指定タグの値を取り出す
 */
export function extractTagValue(xml: string, tagName: string): string | null {
  const matcher = new RegExp(`<${tagName}>([^<]+)</${tagName}>`);
  const match = xml.match(matcher);
  return match?.[1] ?? null;
}

export type AmazonGiftCardConfig = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
  partnerId: string;
};

export type CreateGiftCardResult = {
  status: number;
  resultStatus: string | null;
  claimCode: string | null;
  rawResponse: string;
};

type FetchImpl = typeof fetch;

/**
 * Amazon CreateGiftCard API を一回呼び出す。
 * SigV4 署名 + XML 組立 + リクエスト送信をひとまとめにする。
 *
 * @param fetchImpl  Deno.serve とは独立に差し替え可能（テスト用）
 */
export async function createAmazonGiftCard(params: {
  config: AmazonGiftCardConfig;
  creationRequestId: string;
  currencyCode: string;
  amount: string;
  requestAmzDate: string;
  fetchImpl?: FetchImpl;
}): Promise<CreateGiftCardResult> {
  const { config, creationRequestId, currencyCode, amount, requestAmzDate } =
    params;
  const fetchImpl = params.fetchImpl ?? fetch;

  const url = new URL("/CreateGiftCard", config.endpoint);
  const host = url.host;
  const dateStamp = requestAmzDate.slice(0, 8);

  const bodyXml = buildXmlBody({
    creationRequestId,
    partnerId: config.partnerId,
    currencyCode,
    amount,
  });
  const payloadHash = await sha256Hex(bodyXml);

  const canonicalHeaders = [
    `accept:${AMAZON_ACCEPT}`,
    `content-type:${AMAZON_CONTENT_TYPE}`,
    `host:${host}`,
    `x-amz-date:${requestAmzDate}`,
    `x-amz-target:${AMAZON_TARGET}`,
    "",
  ].join("\n");
  const signedHeaders = "accept;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    "/CreateGiftCard",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/${AMAZON_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    requestAmzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(
    config.secretKey,
    dateStamp,
    config.region,
  );
  const signature = toHex(
    (await hmacSha256(signingKey, stringToSign)) as unknown as ArrayBuffer,
  );
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: {
      accept: AMAZON_ACCEPT,
      "content-type": AMAZON_CONTENT_TYPE,
      host,
      "x-amz-date": requestAmzDate,
      "x-amz-target": AMAZON_TARGET,
      Authorization: authorizationHeader,
    },
    body: bodyXml,
  });

  const rawResponse = await response.text();
  return {
    status: response.status,
    resultStatus: extractTagValue(rawResponse, "status"),
    claimCode: extractTagValue(rawResponse, "gcClaimCode"),
    rawResponse,
  };
}

/**
 * 環境変数から Amazon API 接続情報を読み出す。
 * 未設定がある場合は `missing` に欠落キー名一覧を載せて返す。
 */
export function loadAmazonGiftCardConfig(
  getEnv: (key: string) => string | undefined = Deno.env.get.bind(Deno.env),
):
  | { ok: true; config: AmazonGiftCardConfig }
  | { ok: false; missing: string[] } {
  const endpoint = getEnv("AMAZON_ENDPOINT");
  const accessKey = getEnv("AMAZON_ACCESS_KEY");
  const secretKey = getEnv("AMAZON_SECRET_KEY");
  const region = getEnv("AMAZON_REGION");
  const partnerId = getEnv("AMAZON_PARTNER_ID");

  const missing: string[] = [];
  if (!endpoint) missing.push("AMAZON_ENDPOINT");
  if (!accessKey) missing.push("AMAZON_ACCESS_KEY");
  if (!secretKey) missing.push("AMAZON_SECRET_KEY");
  if (!region) missing.push("AMAZON_REGION");
  if (!partnerId) missing.push("AMAZON_PARTNER_ID");

  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    config: {
      endpoint: endpoint as string,
      accessKey: accessKey as string,
      secretKey: secretKey as string,
      region: region as string,
      partnerId: partnerId as string,
    },
  };
}
