import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export type FcmNotification = {
  title: string;
  body: string;
};

export type FcmTarget = {
  id: number;
  fcmToken: string;
};

export type FcmSendResult = {
  targetCount: number;
  successCount: number;
  failureCount: number;
  successTokens: string[];
  errors: {
    token: string;
    message: string;
    statusCode?: number;
    errorStatus?: string;
  }[];
};

export type FcmBatchResult = {
  sentCount: number;
  successTargetIds: number[];
  results: {
    targetId: number;
    success: boolean;
    error?: string;
    statusCode?: number;
  }[];
};

type FcmPerTargetResult = {
  targetId: number;
  success: boolean;
  error?: string;
  statusCode?: number;
};

type FcmBatchOptions = {
  data?: Record<string, string>;
  batchSize?: number;
  concurrency?: number;
  onResult?: (result: FcmPerTargetResult) => void;
};

const textEncoder = new TextEncoder();

function base64UrlEncode(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? textEncoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const bytes = base64ToBytes(cleaned);
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied.buffer;
}

function normalizePrivateKey(value?: string): string | undefined {
  if (!value) return undefined;
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function loadFcmEnv() {
  const rawJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  let projectId: string | undefined;
  let clientEmail: string | undefined;
  let privateKey: string | undefined;

  if (rawJson) {
    let parsed: {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    try {
      parsed = JSON.parse(rawJson);
    } catch (error) {
      throw new Error(
        `Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    projectId = parsed.project_id;
    clientEmail = parsed.client_email;
    privateKey = parsed.private_key;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON must include project_id/client_email/private_key",
      );
    }
  } else {
    projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase env (FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY)",
      );
    }
  }

  const normalizedPrivateKey = normalizePrivateKey(privateKey);
  return {
    projectId,
    clientEmail,
    privateKey: normalizedPrivateKey ?? privateKey,
  };
}

async function createJwt(
  clientEmail: string,
  privateKey: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const keyData = pemToArrayBuffer(privateKey);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    textEncoder.encode(unsignedToken),
  );
  const signed = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signed}`;
}

export function getFirebaseConfig(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  try {
    return loadFcmEnv();
  } catch {
    return null;
  }
}

export function getAccessToken(params: {
  clientEmail: string;
  privateKey: string;
}): Promise<string> {
  return getAccessTokenInternal(params.clientEmail, params.privateKey);
}

export async function prepareFcmBatchContext(): Promise<{
  projectId: string;
  accessToken: string;
}> {
  const firebaseConfig = getFirebaseConfig();
  if (!firebaseConfig) {
    throw new Error("Firebase configuration is invalid");
  }
  const accessToken = await getAccessTokenInternal(
    firebaseConfig.clientEmail,
    firebaseConfig.privateKey,
  );
  return { projectId: firebaseConfig.projectId, accessToken };
}

async function getAccessTokenInternal(
  clientEmail: string,
  privateKey: string,
): Promise<string> {
  const assertion = await createJwt(clientEmail, privateKey);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch access token (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Access token not found in response");
  }

  return data.access_token;
}

async function sendMessage(
  accessToken: string,
  projectId: string,
  token: string,
  notification: FcmNotification,
  data?: Record<string, string>,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const body: Record<string, unknown> = {
    message: {
      token,
      notification,
      ...(data ? { data } : {}),
      android: {
        priority: "high",
      },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (response.ok) {
    return { success: true };
  }

  const errorText = await response.text();
  return {
    success: false,
    statusCode: response.status,
    error: errorText,
  };
}

function parseFcmErrorStatus(errorText: string): string | undefined {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { status?: string };
    };
    return parsed.error?.status;
  } catch {
    return undefined;
  }
}

export function isInvalidFcmTokenError(params: {
  message: string;
  statusCode?: number;
  errorStatus?: string;
}): boolean {
  const normalizedStatus = params.errorStatus?.toUpperCase();
  if (normalizedStatus === "UNREGISTERED") return true;
  if (normalizedStatus === "INVALID_ARGUMENT") return true;

  const normalizedMessage = params.message.toUpperCase();
  if (normalizedMessage.includes("UNREGISTERED")) return true;
  if (
    normalizedMessage.includes(
      "REGISTRATION TOKEN IS NOT A VALID FCM REGISTRATION TOKEN",
    )
  ) {
    return true;
  }

  if (params.statusCode === 404 && normalizedMessage.includes("NOT_FOUND")) {
    return true;
  }

  return false;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunkSize = Math.max(1, size);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const safeLimit = Math.max(1, limit);
  const results: R[] = [];
  let index = 0;

  const workers = Array.from({ length: Math.min(safeLimit, items.length) }).map(
    async () => {
      while (index < items.length) {
        const currentIndex = index;
        index += 1;
        results[currentIndex] = await handler(items[currentIndex]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

export async function sendFcmNotifications(
  tokens: string[],
  notification: FcmNotification,
  options?: FcmBatchOptions,
): Promise<FcmSendResult> {
  const uniqueTokens = Array.from(
    new Set(tokens.map((token) => token.trim()).filter(Boolean)),
  );

  if (uniqueTokens.length === 0) {
    return {
      targetCount: 0,
      successCount: 0,
      failureCount: 0,
      successTokens: [],
      errors: [],
    };
  }

  const { projectId, accessToken } = await prepareFcmBatchContext();

  const tokenById = new Map<number, string>();
  const targets: FcmTarget[] = uniqueTokens.map((token, index) => {
    const id = index + 1;
    tokenById.set(id, token);
    return { id, fcmToken: token };
  });

  const batchResult = await sendFcmNotificationsBatch({
    projectId,
    accessToken,
    targets,
    notification,
    ...options,
  });

  const successTokens = batchResult.successTargetIds
    .map((id) => tokenById.get(id))
    .filter((token): token is string => !!token);
  const errors = batchResult.results
    .filter((result) => !result.success)
    .map((result) => ({
      token: tokenById.get(result.targetId) ?? "",
      message: result.error ?? "Unknown error",
      statusCode: result.statusCode,
      errorStatus: result.error ? parseFcmErrorStatus(result.error) : undefined,
    }));

  return {
    targetCount: uniqueTokens.length,
    successCount: batchResult.sentCount,
    failureCount: errors.length,
    successTokens,
    errors,
  };
}

export function sendFcmNotificationsWithTokens(
  params: {
    tokens: string[];
    notification: FcmNotification;
  } & FcmBatchOptions,
): Promise<FcmSendResult> {
  const { tokens, notification, ...options } = params;
  return sendFcmNotifications(tokens, notification, options);
}

export async function sendFcmNotificationsBatch(
  params: {
    projectId: string;
    accessToken: string;
    targets: FcmTarget[];
    notification: FcmNotification;
  } & FcmBatchOptions,
): Promise<FcmBatchResult> {
  const {
    projectId,
    accessToken,
    targets,
    notification,
    data,
    batchSize = 500,
    concurrency = 20,
    onResult,
  } = params;

  const safeTargets = targets
    .map((target) => ({ id: target.id, fcmToken: target.fcmToken.trim() }))
    .filter((target) => target.fcmToken.length > 0);

  if (safeTargets.length === 0) {
    return { sentCount: 0, successTargetIds: [], results: [] };
  }

  const results: FcmBatchResult["results"] = [];
  const successTargetIds: number[] = [];
  let sentCount = 0;

  const batches = chunkArray(safeTargets, batchSize);
  for (const batch of batches) {
    const batchResults = await mapWithConcurrency(
      batch,
      concurrency,
      async (target): Promise<FcmPerTargetResult> => {
        try {
          const sendResult = await sendMessage(
            accessToken,
            projectId,
            target.fcmToken,
            notification,
            data,
          );

          if (sendResult.success) {
            return { targetId: target.id, success: true };
          }

          return {
            targetId: target.id,
            success: false,
            error: sendResult.error ?? "Unknown error",
            statusCode: sendResult.statusCode,
          };
        } catch (error) {
          return {
            targetId: target.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    );

    for (const result of batchResults) {
      results.push(result);
      onResult?.(result);
      if (result.success) {
        sentCount += 1;
        successTargetIds.push(result.targetId);
      }
    }
  }

  return { sentCount, successTargetIds, results };
}

export async function sendFcmNotificationsWithTargets(
  params: {
    targets: FcmTarget[];
    notification: FcmNotification;
  } & FcmBatchOptions,
): Promise<FcmBatchResult> {
  const { targets, notification, ...options } = params;
  const { projectId, accessToken } = await prepareFcmBatchContext();
  return sendFcmNotificationsBatch({
    projectId,
    accessToken,
    targets,
    notification,
    ...options,
  });
}
