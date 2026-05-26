# 共通テストヘルパー

このディレクトリには、Supabase Edge
Functionsテストで使用する共通のテストユーティリティが含まれています。
一部のモジュール（`data-loader.ts`,
`test-helpers.ts`）はE2Eテストからも利用可能なクロスプラットフォーム設計です。

## ファイル構成

```
backend/supabase/test/
├── .gitignore
├── deno.json               # Denoの設定・インポートマップ・タスク定義
├── deno.lock
├── run-test.sh             # テスト実行スクリプト（環境変数設定 + Denoテスト実行）
├── create-todo/
│   └── create-todo.test.ts # create-todo Edge Functionのテスト
├── get-todos/
│   └── get-todos.test.ts   # get-todos Edge Functionのテスト
└── shared/                 # 共通テストユーティリティ
    ├── data-loader.ts      # CSVデータの読み込みとSupabaseへの投入（Deno & Node.js）
    ├── test-helpers.ts     # テストデータ管理クラスとログ関数（Deno & Node.js）
    ├── deno-helpers.ts     # Supabase Functions固有のヘルパー（Denoのみ）
    ├── user-helpers.ts     # ユーザー管理ヘルパー関数（Denoのみ）
    └── README.md           # このファイル

frontend/web/test/e2e/
└── shared/                 # E2Eテスト用の共通ユーティリティ
    ├── freezeTime.ts
    ├── test-helpers.ts
    ├── todo-helpers.ts
    └── user-helpers.ts
```

## インポートマップ（deno.json）

テストファイルからのインポートには `deno.json`
で定義されたエイリアスを使用します：

| エイリアス          | パス                    | 説明                         |
| ------------------- | ----------------------- | ---------------------------- |
| `@shared/`          | `./shared/`             | 共通テストユーティリティ     |
| `@supabase-shared/` | `../functions/_shared/` | Edge Functions共有モジュール |
| `@tests/`           | `./`                    | テストルート                 |
| `@std/assert`       | deno.land/std           | Deno標準アサーション         |
| `@std/csv`          | deno.land/std           | Deno標準CSVパーサー          |
| `@supabase/client`  | esm.sh                  | Supabase JSクライアント      |

## 主な機能

### 1. データローダー (`data-loader.ts`)

CSVファイルからテストデータを読み込み、Supabaseにロードするユーティリティ。
Deno（Supabase Functions）とNode.js（E2Eテスト）の両環境で動作します。

#### 関数

- `loadCsvFile(filePath: string)` - CSVファイルを読み込んでパース
- `insertTestData(tableName: string, data: Record<string, unknown>[])` -
  データを挿入
- `clearTable(tableName: string)` - テーブルをクリア
- `loadTestData(tableName: string, csvFilePath: string, truncate?: boolean)` -
  CSVからデータをロード
- `loadMultipleTestData(testDataList: Array<{...}>)` -
  複数のテストデータを一括ロード
- `resolveDataPath(testDir: string, fileName: string)` -
  テストデータファイルのパスを解決

#### 使用例（直接使用）

```typescript
import { clearTable, loadTestData } from "@shared/data-loader.ts";

// データをロード（既存データをクリアしてから）
await loadTestData("m_notice", "./data/base.csv", true);

// テーブルをクリア
await clearTable("m_notice");
```

### 2. テストヘルパー (`test-helpers.ts`)

テストデータのセットアップ/クリーンアップを管理するクラスとログ関数。

#### TestDataクラス

テストデータのライフサイクルを管理します。

```typescript
import { TestData } from "@shared/test-helpers.ts";

const testData = new TestData(
  "m_notice", // テーブル名
  "./data/base.csv", // CSVファイルパス（テストファイルからの相対パス）
  true, // セットアップ時にクリアするか（デフォルト: true）
);

// セットアップ
await testData.setup();

try {
  // テスト実行
  // ...
} finally {
  // クリーンアップ
  await testData.cleanup();
}
```

#### ログ関数

テストの開始と終了を視覚的に区別するログを出力します。

```typescript
import { logTestEnd, logTestStart } from "@shared/test-helpers.ts";

logTestStart("お知らせ一覧取得テスト");
// ================================================================================
// テスト開始: お知らせ一覧取得テスト
// ================================================================================

// テスト実行...

logTestEnd("お知らせ一覧取得テスト");
// ================================================================================
// テスト終了: お知らせ一覧取得テスト
// ================================================================================
```

### 3. Deno専用ヘルパー (`deno-helpers.ts`)

Deno環境でのみ使用可能。Edge
Functionのテストに必要なリクエスト送信やアサーション関数を提供します。

#### 関数

- `getSupabaseConfig()` - 環境変数からSupabase設定（URL, PUBLISHABLE_KEY）を取得
- `buildEndpointUrl(functionName: string)` - Edge
  FunctionのエンドポイントURLを構築
- `makeRequest(functionName, method, body?, headers?)` - Edge
  Functionにリクエスト送信
- `makeRawRequest(functionName, method, rawBody?, headers?)` -
  生のボディでリクエスト送信
- `makeRequestWithTiming(functionName, method, body?, headers?)` -
  レスポンス時間を計測してリクエスト
- `logNon200Response(response)` -
  200以外のレスポンスをログ出力（500エラーはthrow）
- `assertSuccessResponse(response)` - 成功レスポンス（200 OK）を検証
- `assertCorsHeaders(response)` - CORSヘッダーを検証
- `assertErrorResponse(response, expectedStatus, expectedErrorMessage?)` -
  エラーレスポンスを検証
- `assertResponseTime(responseTime, maxTime)` -
  レスポンス時間が閾値以内であることを検証

### 4. ユーザー管理ヘルパー (`user-helpers.ts`)

Deno環境でのみ使用可能。テストユーザーの作成・削除を行うユーティリティです。

#### 関数

- `createTestUser(email, password, createdProgram?)` -
  テストユーザーを作成してアクセストークンを取得
- `cleanupTestUser(authUserId, supabase)` - テストユーザーを削除（m_user +
  auth.users）

#### 戻り値の型（TestUser）

```typescript
interface TestUser {
  authUserId: string; // auth.users.id
  mUserId: string; // m_user.id (UUID v7)
  accessToken: string; // 認証トークン
  supabase: SupabaseClient; // service_role権限のSupabaseクライアント
}
```

## 使用方法

### Supabase Functionsテストでの使用

共通ヘルパーとDeno固有ヘルパーの両方をインポートします：

```typescript
// backend/supabase/test/create-todo/create-todo.test.ts
import {
  assertErrorResponse,
  assertResponseTime,
  buildEndpointUrl,
  logNon200Response,
  makeRequest,
} from "@shared/deno-helpers.ts";
import { logTestEnd, logTestStart } from "@shared/test-helpers.ts";
import { cleanupTestUser, createTestUser } from "@shared/user-helpers.ts";
import { assert, assertEquals, assertExists } from "@std/assert";
import type { SupabaseClient } from "@supabase/client";
import type { Database } from "@supabase-shared/database.types.ts";

Deno.test({
  name: "create-todo - titleなし（400エラー）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("titleなし（400エラー）");

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      "test-create-todo@example.com",
      "TestPassword123!",
      "create-todo",
    );

    try {
      const endpointUrl = buildEndpointUrl("create-todo");
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ description: "説明のみ" }),
      });

      await logNon200Response(response.clone());
      assertEquals(response.status, 400);
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("titleなし（400エラー）");
  },
});
```

### E2Eテストでの使用

共通ヘルパーをインポートします（`deno-helpers.ts`, `user-helpers.ts`
は使用できません）：

```typescript
// frontend/web/test/e2e/todos/todos.spec.ts
import { test } from "@playwright/test";
import path from "node:path";
import { loadTestData } from "../shared/data-loader.ts";
import { logTestEnd, logTestStart, TestData } from "../shared/test-helpers.ts";

test("ToDo一覧表示テスト", async ({ page }) => {
  // 方法1: 直接関数を使う
  const csvPath = path.join(__dirname, "data", "base.csv");
  await loadTestData("t_todo", csvPath, true);

  // 方法2: TestDataクラスを使う
  const testData = new TestData("t_todo", csvPath);
  await testData.setup();

  try {
    // テスト実行...
  } finally {
    await testData.cleanup();
  }
});
```

## テスト実行

### run-test.sh

`run-test.sh`
はSupabaseローカル環境の環境変数を自動設定してDenoテストを実行するスクリプトです。

```bash
# 全テストを実行
./run-test.sh

# 特定のテストのみ実行
./run-test.sh create-todo/create-todo.test.ts
```

スクリプトの動作：

1. Supabaseの起動状態を確認
2. データベースをリセット（`supabase db reset`）
3. `supabase status -o env` から環境変数を取得・設定
4. Denoテストを実行
5. テスト結果のサマリーを生成（GitHub Actions対応）

### deno taskでの実行

```bash
cd backend/supabase/test
deno task test    # 全テスト実行
deno task lint    # リント
deno task fmt     # フォーマットチェック
```

## 環境変数

以下の環境変数が必要です：

### Supabase Functions用

- `SUPABASE_URL` - SupabaseのURL
- `SUPABASE_PUBLISHABLE_KEY` - Publishable Key
- `SERVICE_ROLE_KEY` - サービスロールキー

### E2Eテスト用

- `NEXT_PUBLIC_SUPABASE_URL` - SupabaseのURL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Publishable Key
- `SUPABASE_SERVICE_ROLE_KEY` - サービスロールキー

## 技術的な詳細

### クロスプラットフォーム対応

`data-loader.ts` と `test-helpers.ts` は、実行環境（Deno または
Node.js）を自動的に判定し、適切なAPIを使用します：

- **ファイル読み込み**: `Deno.readTextFile` / `fs.readFileSync`
- **CSV パース**: Deno標準ライブラリ / `csv-parse`
- **環境変数**: `Deno.env.get` / `process.env`

### Deno専用モジュール

`deno-helpers.ts` と `user-helpers.ts` はDeno環境でのみ使用可能です。

- `deno-helpers.ts` - Edge
  Functionへのリクエスト送信、レスポンスの検証、パフォーマンス検証
- `user-helpers.ts` - テストユーザーの作成（auth.users +
  m_user）、削除、アクセストークン取得

### ファイル構成の違い

E2EテストとFunctionsテストでは、それぞれ独立した`shared`ディレクトリを持っています：

- `frontend/web/test/e2e/shared/` - E2Eテスト用の共通ユーティリティ
  - `freezeTime.ts` - 時刻固定ユーティリティ（E2E専用）
  - `test-helpers.ts` - テスト用ヘルパー関数
  - `todo-helpers.ts` - ToDoテスト用ヘルパー関数
  - `user-helpers.ts` - ユーザー管理ヘルパー関数（E2E専用）

- `backend/supabase/test/shared/` - Edge Functionsテスト用の共通ユーティリティ
  - `data-loader.ts` - テストデータローダー
  - `test-helpers.ts` - テスト用ヘルパー関数
  - `deno-helpers.ts` - Deno固有のヘルパー関数
  - `user-helpers.ts` - ユーザー管理ヘルパー関数（Deno専用）

## インポートパス

### Supabase Functionsテストでのインポート

`deno.json`でエイリアスが設定されているため、`@shared/`を使用してインポートします：

```typescript
// Deno固有のヘルパー
import { buildEndpointUrl, makeRequest } from "@shared/deno-helpers.ts";

// 共通ヘルパー
import { logTestEnd, logTestStart, TestData } from "@shared/test-helpers.ts";
import { loadTestData } from "@shared/data-loader.ts";
import { cleanupTestUser, createTestUser } from "@shared/user-helpers.ts";
```

### E2Eテストでのインポート

E2Eテストでは、相対パスを使用してインポートします：

```typescript
// 共通ヘルパー
import { logTestEnd, logTestStart, TestData } from "../shared/test-helpers.ts";
import { loadTestData } from "../shared/data-loader.ts";

// E2E専用ヘルパー
import { freezeTime } from "../shared/freezeTime.ts";
import {
  cleanupE2ETestUser,
  createE2ETestUser,
} from "../shared/user-helpers.ts";
```
