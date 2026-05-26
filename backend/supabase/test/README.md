# Edge Functionsテストガイド

Supabase Edge
Functionsの統合テストについてのガイドです。テストはDenoを使用して、ローカルで起動したEdge
Functionに対してHTTPリクエストを送信して検証します。

## 📁 ディレクトリ構造

```
backend/supabase/test/
├── deno.json                                   # Deno設定ファイル（インポートマップ・タスク定義）
├── deno.lock                                   # Denoロックファイル
├── run-test.sh                                 # テスト実行スクリプト（環境変数自動設定）
├── shared/                                     # 共通テストユーティリティ
│   ├── test-helpers.ts                         # テストデータ管理クラスとログ関数
│   ├── data-loader.ts                          # CSVテストデータローダー
│   ├── deno-helpers.ts                         # Edge Function向けリクエスト送信・アサーション関数
│   ├── user-helpers.ts                         # テストユーザー作成・削除ユーティリティ
│   └── README.md                               # 共通ユーティリティの詳細ドキュメント
└── [function-name]/                            # 各Edge Functionのテスト
    ├── [function-name].test.ts                 # テストファイル（例: get-todos/get-todos.test.ts）
    └── data/                                   # テストデータ（CSV）
        └── base.csv
```

## 🎯 テストの概要

### 統合テストとしての位置づけ

このテストは**統合テスト**として、実際にデプロイされたSupabase Edge
Functionに対してHTTPリクエストを送信します。

- **実際のエンドポイント**を使用したテスト
- **ネットワークアクセス**が必要（`--allow-net`フラグ）
- **リアルタイム**でのAPI動作確認
- **パフォーマンステスト**も含む

### テストユーザーの管理

各テストケースでテストユーザーを動的に作成・削除します。

- `createTestUser()`: テストユーザーを作成し、アクセストークンを取得
- `cleanupTestUser()`: テストユーザーを削除（`m_user` + `auth.users`）
- テストユーザーの事前作成は不要

### テストファイルの命名規則

- `{function-name}/{function-name}.test.ts` - 各Edge Functionのテスト
- 例: `get-todos/get-todos.test.ts`, `create-todo/create-todo.test.ts`

## 🚀 テストの実行

### 前提条件

以下がインストールされていることを確認してください：

```bash
# Deno
deno --version

# Supabase CLI
supabase --version
```

Supabaseローカル環境が起動している必要があります：

```bash
cd backend
supabase start -x studio,mailpit
supabase db reset
cd ..
```

### 方法1: run-test.sh を直接実行

```bash
cd backend/supabase/test

# すべてのテストを実行
./run-test.sh

# 特定のテストファイルを実行
./run-test.sh get-todos/get-todos.test.ts
```

### 方法3: 環境変数を手動設定して実行

```bash
# Supabaseローカル環境から環境変数を取得
cd backend
eval $(supabase status -o env | sed 's/"//g')
export SUPABASE_URL=$API_URL
export SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
export SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
cd ..

# テストを実行
cd backend/supabase/test
deno task test
```

### 方法4: deno test で直接実行

```bash
cd backend/supabase/test

# 特定のテストファイルを実行
deno test --allow-net --allow-all get-todos/get-todos.test.ts

# すべてのテストファイルを実行
deno test --allow-net --allow-all **/*.test.ts
```

### Windows (Git Bash) の場合

```bash
# 直接スクリプトを実行
bash backend/supabase/test/run-test.sh
```

**注意**: Windowsの場合は、Git
Bashまたは同等のBash互換シェルを使用してください。PowerShellやコマンドプロンプトでは動作しません。

### 利用可能な deno task

```bash
cd backend/supabase/test

deno task test        # 全テスト実行
deno task lint        # リント
deno task fmt         # フォーマットチェック
deno task fmt:write   # フォーマット自動修正
```

## ⚙️ run-test.sh の動作

`run-test.sh`
はSupabaseローカル環境の環境変数を自動設定してDenoテストを実行するスクリプトです。

### 実行フロー

1. Supabaseの起動状態を確認
2. データベースをリセット（`supabase db reset`）
3. `supabase status -o env` から環境変数を取得・設定
4. Denoテストを実行
5. テスト結果のサマリーを生成（GitHub Actions対応）

### 設定される環境変数

| 環境変数                   | 説明                | 取得元                                  |
| -------------------------- | ------------------- | --------------------------------------- |
| `SUPABASE_URL`             | Supabase API URL    | `supabase status` の `API_URL`          |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable Key     | `supabase status` の `ANON_KEY`         |
| `DB_URL`                   | データベース接続URL | `supabase status` の `DB_URL`           |
| `SERVICE_ROLE_KEY`         | サービスロールキー  | `supabase status` の `SERVICE_ROLE_KEY` |

## 📝 テストの書き方

### 基本構造

```typescript
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

const FUNCTION_NAME = "your-function-name";

const TEST_USER = {
  email: "test-your-function@example.com",
  password: "TestPassword123!",
};
```

### テストケースのパターン

#### メソッド制限の検証

```typescript
Deno.test("your-function - GET以外のリクエスト（405エラー）", async () => {
  logTestStart("GET以外のリクエスト（405エラー）");
  const response = await makeRequest(FUNCTION_NAME, "POST");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("GET以外のリクエスト（405エラー）");
});
```

#### 認証の検証

```typescript
Deno.test({
  name: "your-function - 認証ヘッダーなし（401エラー）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("認証ヘッダーなし（401エラー）");
    const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

    const response = await fetch(endpointUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    await logNon200Response(response.clone());
    assertEquals(response.status, 401);
    logTestEnd("認証ヘッダーなし（401エラー）");
  },
});
```

#### 正常系の検証（テストユーザーを使用）

```typescript
Deno.test({
  name: "your-function - 正常なレスポンス",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("正常なレスポンス");

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());
      assertEquals(response.status, 200);

      const result = await response.json();
      // アサーション...
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("正常なレスポンス");
  },
});
```

### テストオプション

`sanitizeResources: false` と `sanitizeOps: false`
は、非同期リソースのリーク検知を無効化します。Edge
Functionへのfetchリクエストを含むテストでは、これらを設定してください。

```typescript
Deno.test({
  name: "テスト名",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    // テスト実装
  },
});
```

### インポートマップ（deno.json）

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

## 📊 テストデータの管理

テストでは、CSVファイルを使用してデータベースの状態を準備できます。

### ディレクトリ構成

```
backend/supabase/test/
└── [function-name]/
    └── data/
        ├── base.csv          # 基本テストケース用データ
        ├── pagination.csv    # ページネーション用データ
        └── locale.csv        # 多言語対応用データ
```

### テストデータファイルの形式

CSVファイルは、テーブルのカラム名をヘッダー行に持つ標準的なCSV形式です。

```csv
title,description,is_completed,user_id
タスク1,説明1,false,user-id-1
タスク2,説明2,true,user-id-1
```

**注意点：**

- 空文字列は自動的に`null`に変換されます
- ヘッダー行（1行目）はスキップされます
- 前後の空白は自動的に削除されます

### テストデータの使用例

```typescript
import { clearTable, loadTestData } from "@shared/data-loader.ts";
import { TestData } from "@shared/test-helpers.ts";

// 方法1: 直接関数を使用
await loadTestData("t_todo", "./data/base.csv", true);
await clearTable("t_todo");

// 方法2: TestDataクラスを使用
const testData = new TestData("t_todo", "./data/base.csv", true);
await testData.setup();
try {
  // テスト実行
} finally {
  await testData.cleanup();
}
```

## 🔧 共通テストユーティリティ

### deno-helpers.ts

Edge Functionへのリクエスト送信やレスポンス検証の関数を提供します。

| 関数                                                                   | 説明                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| `getSupabaseConfig()`                                                  | 環境変数からSupabase設定を取得                    |
| `buildEndpointUrl(functionName)`                                       | Edge FunctionのエンドポイントURLを構築            |
| `makeRequest(functionName, method, body?, headers?)`                   | Edge Functionにリクエスト送信                     |
| `makeRawRequest(functionName, method, rawBody?, headers?)`             | 生のボディでリクエスト送信                        |
| `makeRequestWithTiming(functionName, method, body?, headers?)`         | レスポンス時間を計測してリクエスト                |
| `logNon200Response(response)`                                          | 200以外のレスポンスをログ出力（500エラーはthrow） |
| `assertSuccessResponse(response)`                                      | 200 OKを検証                                      |
| `assertCorsHeaders(response)`                                          | CORSヘッダーを検証                                |
| `assertErrorResponse(response, expectedStatus, expectedErrorMessage?)` | エラーレスポンスを検証                            |
| `assertResponseTime(responseTime, maxTime)`                            | レスポンス時間が閾値以内であることを検証          |

### user-helpers.ts

テストユーザーの作成・削除を行うユーティリティです。

| 関数                                               | 説明                                            |
| -------------------------------------------------- | ----------------------------------------------- |
| `createTestUser(email, password, createdProgram?)` | テストユーザーを作成してアクセストークンを取得  |
| `cleanupTestUser(authUserId, supabase)`            | テストユーザーを削除（`m_user` + `auth.users`） |

`createTestUser()` の戻り値：

```typescript
interface TestUser {
  authUserId: string; // auth.users.id
  mUserId: string; // m_user.id (UUID v7)
  accessToken: string; // 認証トークン
  supabase: SupabaseClient; // service_role権限のSupabaseクライアント
}
```

### test-helpers.ts / data-loader.ts

詳細は [shared/README.md](shared/README.md) を参照してください。

## 🤖 CI/CD（GitHub Actions）

ワークフローファイル: `.github/workflows/deno-tests.yml`

### トリガー条件

- `workflow_dispatch`（手動実行）
- コメントアウト中: `development`ブランチへのプッシュ / プルリクエスト

### 実行ステップ

1. **Deno / Supabase CLIのセットアップ**
2. **テスト依存関係のキャッシュ**
3. **Supabaseローカル環境の起動**
   - Studio、Mailpitを除外して起動（`-x studio,mailpit`）
   - `supabase db reset`でDB初期化
   - 環境変数をGitHub Actions環境に設定
4. **Edge Functionsをローカル起動**（`supabase functions serve`）
5. **ヘルスチェック**で起動完了を待機（最大120秒）
6. **Denoテストの実行**
7. **テスト結果サマリーの生成**（GitHub Step Summary）

### テスト結果の確認方法

#### 1. GitHub Actionsページへのアクセス

1. GitHubリポジトリの「Actions」タブをクリック
2. 「Deno Tests」ワークフローを選択
3. 実行履歴から確認したいワークフローをクリック

#### 2. サマリーの確認

ワークフローページに表示されるサマリーには以下が含まれます：

- **Check Results** - テスト実行結果のステータス
- **Test Details** - テスト統計（Total / Passed / Failed）
- **Failed Tests Details** - 失敗したテストの詳細（失敗時のみ）

#### 3. 詳細ログの確認

サマリーだけでは不十分な場合：

1. ワークフローページで「deno-tests」ジョブをクリック
2. 左サイドバーから確認したいステップを選択
   - 「Run Deno tests」- テスト実行の詳細ログ
   - 「Show Edge Functions logs」- Edge Functionsのログ

#### 4. Edge Functionsのログ確認

テスト失敗時はEdge Functions側のエラーも確認してください：

- 「Show Edge Functions logs」ステップで `functions.log` の末尾100行を確認可能
- 起動時のエラー、リクエスト処理中の例外、データベース接続エラーなどを確認

## 🐛 トラブルシューティング

### テストが失敗した場合のチェックリスト

1. **Supabaseが起動しているか確認**

```bash
cd backend
supabase status
```

2. **Edge Functionsが正常に起動しているか確認**

```bash
cd backend
supabase functions serve
# 別のターミナルで health エンドポイントを確認
curl http://127.0.0.1:54321/functions/v1/health -H "Authorization: Bearer <ANON_KEY>"
```

3. **データベースをリセット**

```bash
cd backend
supabase db reset
```

4. **環境変数が正しく設定されているか確認**

```bash
cd backend
supabase status -o env
```

### よくある失敗の原因

- シードデータ（`backend/supabase/seed.sql`）の不整合
- Edge Functionsのコードエラー
- データベーススキーマの変更（マイグレーション適用漏れ）
- テストの期待値が古い
- Supabaseローカル環境が起動していない

### リソースリーク警告への対処

Denoテストでリソースリークの警告が出る場合は、テストオプションに以下を追加してください：

```typescript
Deno.test({
  name: "テスト名",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {/* ... */},
});
```

## 📚 参考リンク

- [Deno公式ドキュメント](https://docs.deno.com/)
- [Deno Testing](https://docs.deno.com/runtime/fundamentals/testing/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI リファレンス](https://supabase.com/docs/reference/cli)
