# Supabase Edge Functions 共通ユーティリティ

このディレクトリには、Supabase Edge Functionsで使用する共通ユーティリティが含まれています。

> **関連ドキュメント**: [プロジェクトルート README.md](../../../README.md) | [システムドキュメント](../../../sysdoc_starter/README.md) | [Supabase実装ガイド](../../../sysdoc_starter/35-development/03_Supabase実装ガイド_Web.md)

## ファイル構成

### 1. `cors.ts` - CORS対応

CORS（Cross-Origin Resource Sharing）関連のユーティリティを提供します。

```typescript
import { handleOptionsRequest, getCorsHeaders, getAllowedOrigin } from "../_shared/cors.ts";

// OPTIONSリクエストの処理（デフォルト: GET, POST）
if (req.method === "OPTIONS") {
  return handleOptionsRequest();
}

// 特定のメソッドのみ許可する場合
if (req.method === "OPTIONS") {
  return handleOptionsRequest(["GET"]); // GETのみ許可
}

// CORSヘッダーの取得（デフォルト: GET, POST, OPTIONS）
const headers = getCorsHeaders();

// 特定のメソッドを指定してCORSヘッダーを取得
const headersCustom = getCorsHeaders(["GET", "DELETE"]); // GET, DELETE, OPTIONS

// 許可するオリジンの取得
const origin = getAllowedOrigin();
```

#### パラメータ

- `handleOptionsRequest(allowedMethods?)`: 許可するメソッドの配列（デフォルト: `["GET", "POST"]`）
  - `OPTIONS`は自動的に追加されます
- `getCorsHeaders(allowedMethods?)`: 許可するメソッドの配列（デフォルト: `["GET", "POST", "OPTIONS"]`）
  - `OPTIONS`は自動的に追加されます

### 2. `supabase.ts` - Supabaseクライアント作成

認証トークン付きのSupabaseクライアントを作成します。

```typescript
import { createAuthenticatedClient } from "../_shared/supabase.ts";

const authHeader = req.headers.get("Authorization");
const supabaseWithAuth = createAuthenticatedClient(authHeader);
```

### 3. `auth.ts` - 認証関連

認証ユーザー情報の取得を提供します。

```typescript
import { getAuthUser, AuthResult } from "../_shared/auth.ts";

// 認証ユーザー情報を取得
const authResult: AuthResult = await getAuthUser(supabaseClient);
if (!authResult.success) {
  // エラー処理
}

// 認証ユーザーIDを使用して必要に応じてRPC呼び出し
const { data, error } = await supabaseClient.rpc("your_function", {
  p_supabase_auth_user_id: authResult.user.id,
});
```

#### 型定義

- `AuthUser`: 認証ユーザー情報
- `AuthResult`: 認証結果

### 4. `response.ts` - レスポンスヘルパー

標準化されたレスポンスを作成します。

```typescript
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthErrorResponse,
  createMethodNotAllowedResponse,
  createJsonResponse,
} from "../_shared/response.ts";

// 成功レスポンス
return createSuccessResponse(data);

// エラーレスポンス
return createErrorResponse("エラーメッセージ", 500);

// 認証エラーレスポンス
return createAuthErrorResponse("認証に失敗しました");

// メソッド不許可レスポンス
return createMethodNotAllowedResponse();

// カスタムJSONレスポンス
return createJsonResponse({ success: true, data }, 200);
```

### 5. `validation.ts` - バリデーション

リクエストのバリデーション機能を提供します。

```typescript
import { validateMethod, getAuthHeader } from "../_shared/validation.ts";

// メソッドの検証
if (!validateMethod(req, ["GET", "POST"])) {
  return createMethodNotAllowedResponse();
}

// Authorizationヘッダーの取得
const authHeader = getAuthHeader(req);
if (!authHeader) {
  return createAuthErrorResponse();
}
```

### 6. `logger.ts` - 構造化ロガー

リクエスト相関に対応した構造化ログ出力を提供します。リクエストごとにrequestIdを自動生成し、HTTPメソッド・パス・userId（JWTから自動抽出）をすべてのログに付与します。

```typescript
import { createRequestLogger } from "../_shared/logger.ts";

// リクエストからロガーインスタンスを作成
const logger = createRequestLogger(req);

// 処理開始ログ（リクエスト情報が自動付与される）
logger.loggingStart({ function: "get-todos" });

// 情報ログ
logger.loggingInfo("データ取得成功", { count: todos.length });

// 警告ログ
logger.loggingWarn("キャッシュがありません");

// エラーログ
logger.loggingError(error, { userId: authResult.user.id });

// 処理終了ログ（HTTPステータスと処理時間が自動計算される）
logger.loggingEnd(200);
```

#### 機能

- **自動マスキング**: パスワード、トークン、個人情報などを自動的にマスク
- **構造化ログ**: JSON形式で出力、ログ分析ツールとの連携が容易
- **リクエストID**: 各リクエストに一意のIDを付与、ログの追跡が可能
- **リクエスト相関**: HTTPメソッド・パス・userIdを全ログに自動付与
- **処理時間計測**: loggingStart〜loggingEnd間の処理時間を自動計算
- **型安全**: TypeScriptの型定義により、型エラーを防止

#### マスキング対象のカスタマイズ

環境変数 `MASK_TARGETS` でマスキング対象のキーをカスタマイズできます：

```bash
# .env.local
MASK_TARGETS='["password","email","api_key","secret"]'
```

### 7. `amazon-gift.ts` - Amazon Incentives API (Gift Card) ヘルパー

`create-amazon-giftcard-for-admin` から利用する、Amazon Incentives API (AGCOD) 用の純粋ロジック集です。SigV4 署名・XML 組立/解析を Deno 標準の `crypto`/`fetch` だけで実装しています。

```typescript
import {
  createAmazonGiftCard,
  loadAmazonGiftCardConfig,
  toAmzDate,
} from "../_shared/amazon-gift.ts";

const configResult = loadAmazonGiftCardConfig();
if (!configResult.ok) {
  throw new Error(`missing env: ${configResult.missing.join(", ")}`);
}

const result = await createAmazonGiftCard({
  config: configResult.config,
  creationRequestId: crypto.randomUUID().replace(/-/g, ""),
  currencyCode: "JPY",
  amount: "1000",
  requestAmzDate: toAmzDate(new Date()),
});

if (result.status >= 200 && result.status < 300 && result.resultStatus === "SUCCESS") {
  console.log("claim code:", result.claimCode);
}
```

#### 必要な環境変数

```bash
# backend/supabase/functions/.env
AMAZON_ENDPOINT=https://agcod-v2-gamma.amazon.com   # 検証環境例
AMAZON_ACCESS_KEY=AKIA...
AMAZON_SECRET_KEY=...
AMAZON_REGION=us-east-1
AMAZON_PARTNER_ID=YourPartnerId
# 呼び出し元（pg_cron / 外部スケジューラ）からの認証用に CRON_KEY も必須
CRON_KEY=任意のランダム文字列
```

#### 提供する関数

| 関数 | 説明 |
|------|------|
| `loadAmazonGiftCardConfig` | 環境変数から接続情報を取得（不足キーは `missing` で返却） |
| `toAmzDate` | Date を `x-amz-date` 形式 (`YYYYMMDDTHHMMSSZ`) に整形 |
| `buildXmlBody` | `CreateGiftCardRequest` の XML 本文を組み立て |
| `extractTagValue` | XML レスポンスから単純なタグ値を取り出す |
| `createAmazonGiftCard` | SigV4 署名 + リクエスト送信 + 結果パースまでを一括実行 |

> `createAmazonGiftCard` は `fetchImpl` を差し替え可能にしてあるため、ユニットテストでは
> Amazon の HTTP モックを注入できます。

## 使用例

完全な実装例（構造化ロガーを使用）：

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAuthUser } from "../_shared/auth.ts";
import { handleOptionsRequest } from "../_shared/cors.ts";
import { createRequestLogger } from "../_shared/logger.ts";
import {
  createSuccessResponse,
  createErrorResponse,
  createMethodNotAllowedResponse,
  createAuthErrorResponse,
} from "../_shared/response.ts";
import { createAuthenticatedClient } from "../_shared/supabase.ts";
import { validateMethod, getAuthHeader } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  // リクエストからロガーを作成（method, path, userId が全ログに自動付与）
  const logger = createRequestLogger(req);
  logger.loggingStart({ function: "your-function" });

  // CORS対応（GETのみ許可）
  if (req.method === "OPTIONS") {
    return handleOptionsRequest(["GET"]);
  }

  try {
    // メソッド検証
    if (!validateMethod(req, ["GET"])) {
      logger.loggingWarn("無効なHTTPメソッド", { method: req.method });
      logger.loggingEnd(405, { errorMessage: "Method not allowed" });
      return createMethodNotAllowedResponse();
    }

    // 認証トークン取得
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      logger.loggingWarn("Authorizationヘッダーが見つかりません");
      logger.loggingEnd(401, { errorMessage: "Missing auth header" });
      return createAuthErrorResponse();
    }

    // Supabaseクライアント作成
    const supabaseWithAuth = createAuthenticatedClient(authHeader);

    // 認証ユーザー情報取得
    const authResult = await getAuthUser(supabaseWithAuth);
    if (!authResult.success || !authResult.user) {
      logger.loggingWarn("認証エラー", { error: authResult.error });
      logger.loggingEnd(401, { errorMessage: authResult.error });
      return createAuthErrorResponse(authResult.error);
    }

    // Database Function 呼び出し（必要に応じて）
    const { data, error } = await supabaseWithAuth.rpc("your_function", {
      p_supabase_auth_user_id: authResult.user.id,
    });

    if (error) {
      logger.loggingError(error, {
        function: "your_function",
        userId: authResult.user.id,
      });
      logger.loggingEnd(500, { errorMessage: error.message });
      return createErrorResponse("データの取得に失敗しました");
    }

    // 成功ログ
    logger.loggingInfo("データ取得成功", {
      userId: authResult.user.id,
      count: data?.length || 0,
    });
    logger.loggingEnd(200);

    // 成功レスポンス
    return createSuccessResponse(data);
  } catch (err) {
    logger.loggingError(err, { context: "Unexpected error" });
    logger.loggingEnd(500, { errorMessage: "サーバーエラー" });
    return createErrorResponse("サーバーエラーが発生しました");
  }
});
```

## メリット

1. **コードの再利用**: 共通処理を一箇所で管理
2. **保守性の向上**: 変更が必要な場合、一箇所を修正するだけでOK
3. **一貫性**: すべてのEdge Functionで同じ処理を保証
4. **可読性**: ビジネスロジックに集中できる
5. **型安全性**: TypeScriptの型定義により、型エラーを防止

## 注意事項

- すべてのEdge Functionで共通ユーティリティを使用してください
- 新しい共通処理が必要な場合は、このディレクトリに追加してください
- 共通ユーティリティを変更する場合は、既存のEdge Functionへの影響を確認してください

