# E2Eテストガイド（Playwright）

このディレクトリには、ブラウザベースのエンドツーエンド（E2E）テストが含まれています。

## 📁 ディレクトリ構造

```
frontend/web/test/
└── e2e/                                        # E2Eテスト（Playwright）
    ├── playwright.config.ts                   # Playwright設定ファイル
    ├── global-setup.ts                        # グローバルセットアップ
    ├── .env.test                              # 環境変数設定ファイル
    ├── .env.test.example                      # 環境変数設定ファイルのサンプル
    ├── shared/                                 # 共通ユーティリティ
    │   ├── freezeTime.ts                      # 時刻固定ユーティリティ
    │   ├── test-helpers.ts                    # テスト用ヘルパー関数
    │   ├── todo-helpers.ts                    # ToDoテスト用ヘルパー関数
    │   └── user-helpers.ts                     # ユーザー管理ヘルパー関数
    └── [機能名]/                               # 各機能のテスト
        └── [機能名].spec.ts                    # テストファイル（例: todos/todos.spec.ts）
```

---

## 🎭 E2Eテスト（Playwright）

### 🎯 テストの概要

E2Eテストでは、各specファイルの実行時に自動的にテストユーザーを作成・削除します。

**テストユーザーの管理**:
- `beforeAll`: テストユーザーを作成
- `afterAll`: テストユーザーを削除
- テストユーザーの認証情報は環境変数での指定不要
- `frontend/web/test/e2e/shared/user-helpers.ts`を使用してユーザーを管理

**使用例**:

```typescript
import { createE2ETestUser, cleanupE2ETestUser, type E2ETestUser } from "../shared/user-helpers";

test.describe("テストスイート", () => {
  let testUser: E2ETestUser;

  test.beforeAll(async () => {
    testUser = await createE2ETestUser("test@example.com", "password123", "user");
  });

  test.afterAll(async () => {
    await cleanupE2ETestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto("/login");
    await page.fill("input[name='email']", testUser.email);
    await page.fill("input[name='password']", testUser.password);
    await page.click("button[type='submit']");
  });
  
  // テスト実装...
});
```

### テストファイルの命名規則

テストファイルは機能ごとにディレクトリに分類されています：

- `{機能名}/*.spec.ts` - 各機能のテスト（例: `todos/todos.spec.ts`）

各テストファイルは `*.spec.ts` という命名規則に従います。

### 主要なテストケース（例）

各機能のテストファイルには、以下のようなテストケースが含まれます：

- **一覧表示のテスト**
  - データが正しく表示される
  - データがない時に適切なメッセージが表示される
  - フィルタリングやソートが正しく動作する

- **CRUD操作のテスト**
  - 新規作成フォームが正しく表示される
  - データを作成して一覧に反映される
  - バリデーションエラーが正しく表示される
  - キャンセルボタンが正しく動作する

### 🚀 テストの実行方法

#### 📋 利用可能な npm スクリプト一覧

| コマンド | 説明 |
|---------|------|
| `npm run test:e2e` | すべてのE2Eテストを実行（ヘッドレスモード） |
| `npm run test:e2e:ui` | UIモードでテストを実行（最も推奨・デバッグに便利） |
| `npm run test:e2e:headed` | ブラウザを表示してテストを実行（動作確認用） |
| `npm run test:e2e:debug` | デバッグモードで実行（ステップ実行、ブレークポイント設定） |
| `npm run test:e2e:report` | テスト結果のHTMLレポートを表示 |

#### ローカル環境での実行

##### 1. 前提条件

以下がインストールされていることを確認してください：

```bash
# Node.js (LTS推奨)
node --version

# Supabase CLI
supabase --version

# Deno (Edge Functions用)
deno --version
```

##### 2. 環境変数の設定

`frontend/web/test/e2e/.env.test` ファイルを作成して、Supabase接続情報を設定します：

```bash
# サンプルファイルをコピー
cp frontend/web/test/e2e/.env.test.example frontend/web/test/e2e/.env.test

# Supabaseの接続情報を取得（backend ディレクトリに移動して実行）
cd backend
supabase status
cd ..

# .env.test ファイルを編集して、接続情報を設定
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY と SUPABASE_SERVICE_ROLE_KEY を
# supabase status で表示される値に置き換えてください
```

`.env.test` ファイルの内容：

```env
# E2Eテスト用環境変数
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# テスト用固定日時（オプション）
FIXED_DATE=2025-10-01T13:00:00Z
```

> **Note:** E2Eテストは実行時に自動的にテストユーザーを作成・削除するため、テストユーザーの事前作成は不要です。

> **重要**: `.env.test` ファイルは `.gitignore` に含まれているため、Gitで管理されません。各環境で個別に作成してください。

##### 3. Supabaseローカル環境の起動

```bash
# backend ディレクトリに移動
cd backend

# Supabaseローカル環境を起動（Studio、Mailpitを除外）
supabase start -x studio,mailpit

# DBをリセット（初期データ投入）
supabase db reset

# プロジェクトルートに戻る
cd ..
```

##### 4. Playwrightブラウザのインストール

```bash
npx playwright install --with-deps
```

##### 5. テストの実行

**推奨: npm run コマンドを使用**

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# UIモードでテストを実行（デバッグに便利）
npm run test:e2e:ui

# ヘッドレスモードを無効にして実行（ブラウザを見ながら実行）
npm run test:e2e:headed

# デバッグモードで実行（ステップ実行、ブレークポイント設定が可能）
npm run test:e2e:debug

# レポートを表示
npm run test:e2e:report
```

**または、npx コマンドで直接実行**

```bash
# すべてのE2Eテストを実行
npx playwright test --config=frontend/web/test/e2e/playwright.config.ts frontend/web/test/e2e

# 特定のテストファイルのみ実行（例：todosテスト）
npx playwright test --config=frontend/web/test/e2e/playwright.config.ts frontend/web/test/e2e/todos/todos.spec.ts

# UIモードでテストを実行
npx playwright test --config=frontend/web/test/e2e/playwright.config.ts frontend/web/test/e2e --ui

# ヘッドレスモードを無効にして実行
npx playwright test --config=frontend/web/test/e2e/playwright.config.ts frontend/web/test/e2e --headed

# デバッグモードで実行
npx playwright test --config=frontend/web/test/e2e/playwright.config.ts frontend/web/test/e2e --debug

# レポートを表示
npx playwright show-report
```

### 🤖 CI/CD環境での実行（GitHub Actions）

#### ワークフローの概要

`.github/workflows/playwright-tests.yml`でPlaywrightテストが実行されます。

##### トリガー条件

- **手動実行**（`workflow_dispatch`）

##### 実行ステップ

1. **Denoのセットアップ**（Edge Functionsテスト用依存のキャッシュ）
2. **Supabase CLIのセットアップ**
3. **Supabaseローカル環境の起動**
   - Studio、Mailpitを除外して起動（`-x studio,mailpit`）
   - `supabase db reset`でDB初期化
   - `supabase status -o env`で環境変数を`$GITHUB_ENV`に出力
4. **Node.jsのセットアップ**（node-version: '20', npmキャッシュ）
5. **依存関係のインストール**
   - `npm ci`
6. **ネイティブモジュールの再ビルド**
   - `npm rebuild`（lightningcss対応）
7. **Playwrightブラウザのインストール**
   - `npx playwright install --with-deps`
8. **テストの実行**
   - テスト結果を`playwright-results.txt`に出力
   - レポーター: `list,html`
9. **テスト結果サマリーの生成**
   - GitHub Step Summaryに表示（リポジトリ情報、成功/失敗、統計、失敗詳細）
10. **Playwrightレポートのアップロード**
    - アーティファクトとして保存（30日間保持）

##### 環境変数

CIでは`supabase status -o env`の出力が`$GITHUB_ENV`に追加され、以下の環境変数がテスト実行時に渡されます：

| 環境変数                         | 説明                       | 値                              |
| -------------------------------- | -------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase API URL           | `supabase status -o env`から取得 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Supabase Publishable Key           | `supabase status -o env`から取得 |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabaseサービスロールキー | `supabase status -o env`から取得 |
| `FIXED_DATE`                     | 固定日時（テストの再現性） | `2025-10-01T13:00:00Z`          |

### ⚙️ Playwright設定

#### 主要な設定項目

```typescript
{
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  testIgnore: ["**/backend/supabase/functions/**"],
  fullyParallel: false,  // 順次実行（DB競合を防ぐ）
  workers: 1,            // ワーカー数を1に制限
  retries: process.env.CI ? 2 : 0,  // CI環境では2回リトライ
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",  // 失敗時のみスクリーンショット
    trace: "on-first-retry",        // リトライ時にトレースを記録
  },
}
```

#### テスト実行の特徴

- **順次実行**: DB競合を防ぐため、テストは1つずつ順番に実行されます
- **DBリセット**: 全テスト実行前に`global-setup.ts`が実行され、データベースがリセットされます
- **時刻固定**: `FIXED_DATE`環境変数により、テストの再現性を確保
- **開発サーバー自動起動**: テスト実行前に`npm run dev`が自動実行されます

### 🔧 テストユーティリティ

#### 時刻固定機能 (`shared/freezeTime.ts`)

テストの再現性を確保するため、ブラウザの時刻を固定します：

```typescript
import { freezeTime } from "../shared/freezeTime";

test.beforeEach(async ({ context }) => {
  await freezeTime(context, process.env.FIXED_DATE ?? "2025-10-01T13:00:00Z");
});
```

### 📊 テストレポート

#### ローカル環境

テスト実行後、HTMLレポートが自動生成されます：

```bash
# レポートを表示
npx playwright show-report
```

#### CI環境（GitHub Actions）

- **GitHub Step Summary**: テスト結果の概要がPRやワークフロー実行ページに表示されます
- **Playwrightレポート**: アーティファクトとしてダウンロード可能（30日間保持）

### 🐛 デバッグ

#### デバッグモードでテストを実行

**推奨: npm run コマンドを使用**

```bash
# UIモードでデバッグ（最も使いやすい）
npm run test:e2e:ui

# ヘッドレスモードを無効化（ブラウザの動作を確認）
npm run test:e2e:headed

# デバッガーを起動（ステップ実行、ブレークポイント設定）
npm run test:e2e:debug
```

**または、npx コマンドで直接実行**

```bash
# UIモードでデバッグ
npx playwright test --config=frontend/web/test/e2e/playwright.config.ts frontend/web/test/e2e --ui

# ヘッドレスモードを無効化
npx playwright test --config=frontend/web/test/e2e/playwright.config.ts frontend/web/test/e2e --headed

# デバッガーを起動
npx playwright test --config=frontend/web/test/e2e/playwright.config.ts frontend/web/test/e2e --debug
```

#### 特定のブラウザでテスト

```bash
# Chromiumのみ（npm runコマンド経由）
npm run test:e2e -- --project=chromium

# または、npx コマンドで直接実行
npx playwright test --config=frontend/web/test/e2e/playwright.config.ts frontend/web/test/e2e --project=chromium

# 複数ブラウザを有効化する場合は playwright.config.ts を編集
```

### 📝 テストの書き方

#### 基本的なテスト構造

```typescript
import { expect, test } from "@playwright/test";
import { freezeTime } from "../shared/freezeTime";

test.beforeEach(async ({ context }) => {
  await freezeTime(context, process.env.FIXED_DATE ?? "2025-10-01T13:00:00Z");
});

test("テストケース名", async ({ page }) => {
  // ページに移動
  await page.goto("/your-page");

  // 要素を操作
  await page.fill("input[name='email']", "test@example.com");
  await page.click("button[type='submit']");

  // アサーション
  await expect(page).toHaveURL("/expected-page");
});
```

#### ベストプラクティス

1. **時刻を固定する**: `beforeEach`で`freezeTime`を呼び出す
2. **適切な待機**: `waitForURL`、`waitForSelector`などを使用
3. **環境変数を活用**: 認証情報は環境変数から取得
4. **エラーメッセージを検証**: 多言語対応のため、複数のメッセージパターンをチェック
5. **ファイル名で実行順序を制御**: `00-`, `01-`, `02-`などのプレフィックスを使用

### 🔍 トラブルシューティング

#### よくある問題

##### 1. Supabaseに接続できない

```bash
# backend ディレクトリに移動
cd backend

# Supabaseが起動しているか確認
supabase status

# 起動していない場合
supabase start -x studio,mailpit

# プロジェクトルートに戻る
cd ..
```

##### 2. テストがタイムアウトする

- `playwright.config.ts`の`use`内で`timeout`（ミリ秒）を増やす
- ネットワークが遅い場合は、待機時間を調整

##### 3. DB関連のエラー

```bash
# backend ディレクトリに移動
cd backend

# DBをリセット
supabase db reset

# Supabaseを再起動
supabase stop
supabase start -x studio,mailpit

# プロジェクトルートに戻る
cd ..
```

##### 4. 認証エラー（テストユーザー作成失敗）

- `.env.test`の`SUPABASE_SERVICE_ROLE_KEY`が正しく設定されているか確認（`user-helpers.ts`でテストユーザー作成時に使用）
- Supabaseが起動しており、`supabase status`で表示される値と一致しているか確認

### 📚 参考リンク

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Supabase CLI リファレンス](https://supabase.com/docs/reference/cli)
- [GitHub Actions - Playwright](https://playwright.dev/docs/ci-intro)

---

## 🔧 Edge Functionsテスト（Deno）

Edge Functionsのテストについては [backend/supabase/test/README.md](../../../../backend/supabase/test/README.md) を参照してください。
