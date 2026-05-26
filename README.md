# Next.js Starter with Supabase

Next.js と Supabase を使用したモダンな Web アプリケーションのスターターテンプレートです。

## 📋 新規案件開始手順

このテンプレートを使って新しい案件リポジトリを作成する手順です。

### 1. テンプレートリポジトリをクローン

```bash
# このテンプレートをクローン
git clone https://github.com/org-genai/dev-starter.git my-new-project
cd my-new-project
```

### 2. 新しいリポジトリを作成

GitHubで新規リポジトリ `my-new-project` を作成してください。

### 3. リモートURLを変更

```bash
# 既存のリモートを削除
git remote remove origin

# 新しいリポジトリをリモートとして追加
git remote add origin https://github.com/org-genai/my-new-project.git
```

### 4. サブモジュール（ドキュメント）のブランチ設定

案件専用のドキュメントブランチを作成・設定します。

```bash
# サブモジュールを初期化
git submodule update --init --recursive

# sysdoc_starterで新しいブランチを作成
cd sysdoc_starter
git checkout -b my-new-project
git push -u origin my-new-project
cd ..

# .gitmodulesに案件専用ブランチを設定
git config -f .gitmodules submodule.sysdoc_starter.branch my-new-project

# サブモジュールの参照を更新
git add .gitmodules sysdoc_starter
git commit -m "Set sysdoc_starter to track my-new-project branch"
```

### 5. プロジェクト名とドキュメントをカスタマイズ

```bash
# package.jsonのプロジェクト名を変更
# "name": "dev-starter" → "name": "my-new-project"
vim package.json

# README.mdのタイトルを変更
# "Next.js Starter" → "My New Project"
vim README.md

# sysdoc_starterのドキュメントを案件に合わせて更新
cd sysdoc_starter
# プロジェクト概要、要件定義などを編集
vim 00-brief/01_プロジェクト概要.md

# 変更をコミット
git add .
git commit -m "docs: Customize for my-new-project"
git push origin my-new-project
cd ..
```

### 6. Supabaseプロジェクトを作成

```bash
# Supabaseプロジェクトを作成（オプション: 本番環境用）
# https://app.supabase.com でプロジェクトを作成

# プロジェクトIDをメモして、.env.productionに設定
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxxx
```

### 7. 初回プッシュ

```bash
# 全ての変更をコミット
git add .
git commit -m "chore: Initialize my-new-project from dev-starter template"

# 新しいリポジトリにプッシュ
git push -u origin main
```

### 8. チーム向けREADME更新

README.mdの「新規案件開始手順」セクションを削除し、「新規参画者向けクイックスタート」のリポジトリURLを更新してください。

```bash
# README.mdから「新規案件開始手順」セクションを削除
# 「新規参画者向けクイックスタート」のリポジトリURLを更新
vim README.md

git add README.md
git commit -m "docs: Update README for project team"
git push origin main
```

### ✅ 完了！

これで新しい案件用のリポジトリが作成されました。チームメンバーは「新規参画者向けクイックスタート」に従って開発を開始できます。

---

## 🚀 新規参画者向けクイックスタート

このプロジェクトに参加された方は、以下の手順でローカル開発環境をセットアップしてください。

### 前提条件

以下のツールがインストールされていることを確認してください：

- **Node.js**: v18.x 以上
- **npm**: v9.x 以上
- **Docker**: Supabase ローカル環境に必要
- **Supabase CLI**: [インストール手順](https://supabase.com/docs/guides/cli)
  ```bash
  # macOS/Linux
  brew install supabase/tap/supabase
  
  # Windows
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

### セットアップ手順（5分で完了）

```bash
# 1. リポジトリをクローン（サブモジュールも同時取得）
git clone --recurse-submodules https://github.com/org-genai/my-new-project.git
cd my-new-project

# 2. 依存関係をインストール
npm install

# 3. Supabaseローカル環境を起動
cd backend
supabase start
cd ..

# 4. 環境変数を設定（.env.localを作成）
cat > frontend/web/.env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\$(cd backend && supabase status | grep "anon key" | awk '{print $3}')
EOF

# 5. データベースマイグレーションを適用
cd backend
supabase db reset
cd ..

# 6. 開発サーバーを起動
npm run dev
```

### サブモジュール（ドキュメント）の管理

プロジェクトドキュメントは `sysdoc_starter` サブモジュールで管理されています。

#### 案件専用ブランチ（my-new-project）の最新化

チームメンバーがドキュメントを更新した場合、最新版を取得する手順：

```bash
# 1. 親プロジェクトで最新を取得
git pull

# 2. サブモジュールも最新化
git submodule update --remote

# または、サブモジュール内で直接更新
cd sysdoc_starter
git pull origin my-new-project
cd ..

# 3. 親プロジェクトで参照を更新（必要な場合）
git add sysdoc_starter
git commit -m "docs: Update sysdoc_starter submodule"
git push origin main
```

#### ドキュメントを編集する場合

```bash
# 1. サブモジュールディレクトリに移動
cd sysdoc_starter

# 2. 案件専用ブランチにいることを確認
git branch
# * my-new-project と表示されることを確認

# 3. 最新を取得
git pull origin my-new-project

# 4. ファイルを編集
vim 00-brief/01_プロジェクト概要.md

# 5. コミット & プッシュ
git add .
git commit -m "docs: Update project overview"
git push origin my-new-project

# 6. 親プロジェクトに戻って参照を更新
cd ..
git add sysdoc_starter
git commit -m "docs: Update sysdoc_starter reference"
git push origin main
```

#### sysdoc_starterのmainブランチの更新を取り込む

汎用的なドキュメント更新（mainブランチ）を案件専用ブランチに反映する手順：

```bash
# 1. サブモジュールディレクトリに移動
cd sysdoc_starter

# 2. 現在のブランチを確認（my-new-projectにいることを確認）
git branch
# * my-new-project

# 3. mainブランチの最新を取得
git fetch origin main

# 4. mainブランチの変更をマージ
git merge origin/main

# コンフリクトが発生した場合は解決してください
# git status で確認
# vim [コンフリクトしたファイル] で編集
# git add [解決したファイル]
# git commit

# 5. 案件専用ブランチにプッシュ
git push origin my-new-project

# 6. 親プロジェクトに戻って参照を更新
cd ..
git add sysdoc_starter
git commit -m "docs: Merge sysdoc_starter main branch updates"
git push origin main
```

**注意事項:**
- サブモジュールの変更は、必ず親プロジェクトでも参照を更新してコミットしてください
- チームで作業する場合は、サブモジュールの変更を先にpushしてから親プロジェクトをpushすることを推奨します

---

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router)
- **バックエンド**: Supabase (PostgreSQL + Edge Functions)
- **API サーバー（任意）**: FastAPI (Python 3.12 + uv、API Key 認証)
- **認証**: Supabase Auth（Web/モバイル向け）
- **全文検索**: pgroonga (PostgreSQL 拡張、`TokenMecab` + `NormalizerAuto` / 日本語・英語・数字を高精度に検索)
- **UI**: React, TypeScript
- **スタイリング**: Tailwind CSS
- **コンポーネント**: shadcn/ui
- **リンター**: Biome

## プロジェクト構成

```
dev-starter/
├── frontend/
│   ├── web/                    # Next.js Webアプリ
│   │   ├── src/
│   │   │   ├── app/           # Next.js App Router
│   │   │   │   ├── (auth)/   # 認証関連ページ
│   │   │   │   │   └── login/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/   # UIコンポーネント
│   │   │   │   └── ui/      # shadcn/ui コンポーネント
│   │   │   ├── services/    # サービス層
│   │   │   │   └── supabase/ # Supabase クライアント
│   │   │   ├── hooks/       # カスタムフック
│   │   │   ├── types/       # 型定義
│   │   │   └── utils/       # ユーティリティ関数
│   │   ├── test/             # E2E・統合テスト
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── mobile/                 # Flutter テンプレ
│       ├── lib/
│       └── test/
├── backend/
│   ├── supabase/
│   │   ├── migrations/      # データベースマイグレーション
│   │   ├── functions/       # Edge Functions
│   │   ├── seed/           # 初期データ
│   │   └── config.toml     # Supabase設定
│   └── fastapi/             # FastAPI バックエンド (Python 3.12 + uv)
│       ├── app/
│       ├── pyproject.toml
│       └── README.md
├── sysdoc_starter/          # プロジェクトドキュメント
└── package.json
```

## 詳細なセットアップ手順

以下は各ステップの詳細な説明です。上記のクイックスタートで問題が発生した場合や、より詳しく理解したい場合はこちらを参照してください。

### 0. プロジェクトドキュメントの取得（サブモジュール）

このプロジェクトには、開発ガイドラインやコーディング規約などのドキュメントが別リポジトリ（Git submodule）で管理されています。

**通常の取得方法（推奨）:**

```bash
# リポジトリをクローンする際に、サブモジュールも同時に取得
git clone --recurse-submodules https://github.com/org-genai/dev-starter.git

# または、既にクローン済みの場合
git submodule update --init --recursive
```

**サブモジュールの更新:**

```bash
# サブモジュールの最新版を取得
git submodule update --remote

# 特定のブランチを追跡する場合
git config -f .gitmodules submodule.sysdoc_starter.branch dev-starter
git submodule update --remote
```

**取得されるドキュメント:**
- `sysdoc_starter/` ディレクトリにプロジェクトドキュメントが展開されます
- 詳細は [ドキュメント](#ドキュメント) セクションを参照してください

**注意**: サブモジュールへのアクセスにはGitHubの認証が必要です。プライベートリポジトリの場合は、SSHキーまたはPersonal Access Tokenを設定してください。

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabase ローカル環境のセットアップ

> **重要**: このプロジェクトでは、Supabaseフォルダが `backend/supabase/` に配置されています。
> Supabase CLIコマンドは、`backend/` ディレクトリに移動してから実行してください。

```bash
# backend/ ディレクトリに移動
cd backend

# Supabaseローカル環境の起動
supabase start

# マイグレーションの適用
supabase db push

# プロジェクトルートに戻る
cd ..

# 型定義の生成（プロジェクトルートから実行）
npx --yes supabase gen types typescript --schema public --local > backend/supabase/functions/_shared/database.types.ts
npx --yes supabase gen types typescript --schema public --local > frontend/web/src/types/database.types.ts
```

詳細は [backend/supabase/README.md](backend/supabase/README.md) を参照してください。

### 3. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# Supabase起動後に以下のコマンドで確認できます
# supabase status
```

### 4. テストデータの投入（オプション）

開発・テスト用のテストユーザーとデータを投入します。

1. **auth.users にテストユーザーを作成**
   - Supabase Studio: http://localhost:54323
   - Authentication → Users → Add user

2. **Seedデータを投入**
   ```bash
   psql postgresql://postgres:postgres@localhost:54322/postgres -f backend/supabase/seed/seed.sql
   ```

詳細は [backend/supabase/seed/README.md](backend/supabase/seed/README.md) を参照してください。

### 5. ToDo機能の初期化（マイグレーション実行後）

ToDo機能を使用するには、データベースマイグレーションを適用してください：

```bash
# backend/ ディレクトリに移動
cd backend

# Supabaseローカル環境を起動
supabase start

# データベースをリセットして最新のマイグレーションを適用
supabase db reset

# プロジェクトルートに戻る
cd ..

# 型定義を再生成
npx --yes supabase gen types typescript --schema public --local > frontend/web/src/types/database.types.ts
npx --yes supabase gen types typescript --schema public --local > backend/supabase/functions/_shared/database.types.ts
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

## 開発

### コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番環境で起動
npm start

# リンター実行
npm run lint

# Biomeフォーマット
npm run format
```

### Supabase コマンド

> **注意**: Supabaseフォルダが `backend/supabase/` にあるため、`backend/` ディレクトリに移動してから実行してください。

```bash
# backend/ ディレクトリに移動
cd backend

# Supabase起動
supabase start

# Supabase停止
supabase stop

# データベースリセット
supabase db reset

# マイグレーション作成
supabase migration new [マイグレーション名]

# Edge Function作成
supabase functions new [function-name]

# Edge Functionローカル実行
supabase functions serve [function-name]

# プロジェクトルートに戻る
cd ..

# 型定義生成（プロジェクトルートから実行）
npx --yes supabase gen types typescript --schema public --local > backend/supabase/functions/_shared/database.types.ts
```

## FastAPI バックエンド（任意）

Supabase (Edge Functions) だけでは対応が難しい処理（重い集計、外部 API 連携、AI/ML 推論など）のために、`backend/fastapi/` に Python 製の REST API サーバーを用意しています。

詳細な手順は [backend/fastapi/README.md](backend/fastapi/README.md) を参照してください。

### クイックスタート

```powershell
# 1. uv をインストール（未導入の場合）
# https://docs.astral.sh/uv/getting-started/installation/

# 2. 依存関係をインストール
cd backend/fastapi
uv sync

# 3. 環境変数を設定（API_KEYS を発行した値に書き換え）
Copy-Item .env.example .env
# 例: python -c "import secrets; print(secrets.token_urlsafe(32))"

# 4. 開発サーバー起動
uv run fastapi dev app/main.py
```

- API: http://localhost:8000
- OpenAPI ドキュメント: http://localhost:8000/docs

### 特徴

- **認証は API Key 方式**
  - リクエストヘッダ `X-API-Key: <key>` を `API_KEYS` の許可リストと定数時間比較で検証
  - 複数キーをカンマ区切りで登録可能（ローテーション・クライアント別発行に対応）
  - API Key はサーバーサイドのみで保持し、ブラウザには絶対に露出させない
- **Ruff + mypy (strict) で型安全性と品質を担保**
- **pydantic-settings による環境変数管理**

## LINE ログインのセットアップ

LINE アカウントでログインできるようにするためのセットアップ手順です。既存のメール/パスワード認証と並行して利用できます。

### アーキテクチャ概要

- LINE Login (OIDC) をサーバーサイドで受け、`id_token` を LINE 公式 `/oauth2/v2.1/verify` エンドポイントで検証
- Supabase Admin API で `auth.users` を解決 (LINE sub → email → 新規作成の順) し、既存メールユーザーがいれば LINE を自動リンク
- `generateLink` (magiclink) の `hashed_token` を `verifyOtp` で消費してセッション Cookie を確立
- RLS は通常の `auth.uid()` / `auth.jwt()` がそのまま使える (組み込み OAuth と同じ挙動)

### 1. LINE Developers Console で Provider / Channel を作成

1. [LINE Developers Console](https://developers.line.biz/console/) にログイン
2. **Provider** (まだ無ければ) を作成
3. Provider 配下に **Channel** を作成: **Channel type = LINE Login**
4. Basic settings で以下を控える
   - `Channel ID`
   - `Channel secret`
5. **LINE Login** タブの **Callback URL** に以下を追加
   - 開発: `http://localhost:3000/auth/callback/line`
   - 本番: `https://<本番ドメイン>/auth/callback/line`
6. **OpenID Connect** を有効化
7. (任意) メールアドレスを取得したい場合は「メールアドレス取得権限」を申請・承認
   - 未申請の場合は、取得できなかったユーザーには `line_{sub}@line.local` 形式のプレースホルダ email が割り当てられます

### 2. 環境変数の設定

`frontend/web/.env.local` に以下を設定します（いずれもサーバー専用。`NEXT_PUBLIC_` を付けないこと）。

```bash
# Supabase Admin API (LINE コールバックで使用)
SUPABASE_SERVICE_ROLE_KEY=<Supabase の service_role キー>

# LINE Login
LINE_CHANNEL_ID=<LINE の Channel ID>
LINE_CHANNEL_SECRET=<LINE の Channel Secret>
# 任意: 固定したい場合のみ指定
# LINE_REDIRECT_URI=http://localhost:3000/auth/callback/line
```

`SUPABASE_SERVICE_ROLE_KEY` の取得方法:

```bash
# ローカル
cd backend
supabase status
# "service_role key" の値を使用

# Supabase Cloud
# Dashboard → Project Settings → API → service_role secret
```

### 3. データベースマイグレーションの適用

LINE ユーザー解決用のヘルパー関数 (`find_auth_user_id_by_line_sub` / `find_auth_user_id_by_email`) をマイグレーションで追加しています。

```bash
cd backend
supabase db reset   # もしくは supabase db push
cd ..
```

### 4. 動作確認

```bash
npm run dev
# http://localhost:3000/login を開き、「LINE でログイン」ボタンを押下
```

Supabase Studio (http://localhost:54323) で以下を確認:

- `auth.users` に LINE ユーザーの行が作成され、`raw_app_meta_data.provider_ids.line` に LINE の `sub` が格納されていること
- `public.m_user` に同じユーザーの行が作成されていること
- 2回目ログインで同じ `auth.users.id` が再利用されること（`listUsers` ではなく `find_auth_user_id_by_line_sub` で特定される）

### セキュリティに関する注意

- `state` / `nonce` は httpOnly + SameSite=Lax Cookie で 5 分 TTL。CSRF / リプレイ攻撃を防止
- `SUPABASE_SERVICE_ROLE_KEY` は絶対にクライアントへ露出させない (`src/services/supabase/admin.ts` は `import "server-only"` で保護)
- `id_token` 検証は LINE 公式 `/verify` エンドポイントを利用 (client_id / nonce / 署名 / 有効期限を LINE 側で検証)
- `find_auth_user_id_by_*` 関数は `SECURITY DEFINER` で `service_role` のみ EXECUTE 可能

### 既存ユーザーとの自動リンク

LINE の email が既に他の認証方法 (メール/パスワード等) で登録されている場合、以下のルールで自動リンクされます:

1. `auth.users.app_metadata.provider_ids.line === sub` の既存ユーザー → 再利用
2. LINE から email が取得できていて、同じ email の既存ユーザーがある → `app_metadata.provider_ids.line` に `sub` をマージ (既存 `auth.users.id` を再利用)
3. 上記に該当しなければ新規作成

## テストユーザー（開発環境）

| ロール | Email | Password |
|--------|-------|----------|
| 管理者 | admin@example.com | TestPass1@ |
| 一般ユーザー | user@example.com | TestPass1@ |
| ゲスト | guest@example.com | TestPass1@ |

⚠️ **警告**: これらのテストユーザーは開発環境専用です。本番環境では絶対に使用しないでください。

## ドキュメント

### プロジェクトドキュメント（sysdoc_starter/）

- [プロジェクト概要](sysdoc_starter/00-brief/01_プロジェクト概要.md)
- [要件定義](sysdoc_starter/10-requirements/01_要件定義.md)
- [技術スタック選定](sysdoc_starter/20-architecture/01_技術スタック選定.md)
- [アーキテクチャ概要](sysdoc_starter/20-architecture/02_アーキテクチャ概要.md)
- [データモデル/ERD](sysdoc_starter/30-design/01_データモデル_ERD.md)
- [テーブル定義書](sysdoc_starter/30-design/02_テーブル一覧・定義書.md)
- [Supabase実装ガイド](sysdoc_starter/35-development/03_Supabase実装ガイド_Web.md)
- [コーディング規約](sysdoc_starter/35-development/04_コーディング規約_Web.md)

### Supabaseドキュメント

- [Supabase セットアップガイド](supabase/README.md)
- [マイグレーションガイド](supabase/migrations/README.md)
- [Seedデータガイド](supabase/seed/README.md)

## セキュリティスキャン

本リポジトリでは以下 4 種類のセキュリティチェックを継続的に実行しています。

| 種別 | ツール | 実行場所 | 結果の確認場所 |
|------|--------|----------|----------------|
| シークレット検知 | [Gitleaks](https://github.com/gitleaks/gitleaks) | husky pre-push (任意) + GitHub Actions | Actions ログ / Security タブ |
| 依存ライブラリ脆弱性 | [Trivy](https://github.com/aquasecurity/trivy) | GitHub Actions | Security タブ (Code scanning alerts) |
| SAST (静的解析) | [Semgrep OSS](https://semgrep.dev/) | GitHub Actions | Security タブ (Code scanning alerts) |
| 依存自動更新 | [Dependabot](https://docs.github.com/en/code-security/dependabot) | GitHub 標準 | Pull requests / Security タブ |

### GitHub Actions

- ワークフロー: `.github/workflows/security.yml`
- トリガ: `push (main)` / `pull_request` / 毎週月曜 03:00 JST の定期実行 / 手動実行
- 現状は **警告のみ** で、検知があっても push / merge はブロックしません。
- PR には `<!-- security-scan-bot -->` マーカー付きのコメントで結果サマリが投稿されます。

### ローカル実行 (任意)

各ツールを手元で実行したい場合は、事前にバイナリを導入してから以下のスクリプトを利用します。

```powershell
# Gitleaks
# https://github.com/gitleaks/gitleaks/releases から OS 向けバイナリを取得し PATH に配置
npm run security:secrets

# Trivy
# https://aquasecurity.github.io/trivy/latest/getting-started/installation/
npm run security:deps          # 4 ターゲットを一括スキャン
npm run security:deps:web      # frontend/web のみ
npm run security:deps:mobile   # frontend/mobile のみ
npm run security:deps:fastapi  # backend/fastapi のみ
npm run security:deps:supabase # backend/supabase のみ (deno.lock)

# Semgrep (Python 製: pip install semgrep)
npm run security:sast

# まとめて実行
npm run security:all
```

### husky pre-push でのシークレット検知

- `gitleaks` が PATH に存在する場合、push 対象コミット範囲 (`<remote>..<local>`) に対して自動でスキャンします。
- 未インストール時は警告ログを出して **skip** するため、push が失敗することはありません。
- ローカルで導入したい場合は、上記の Gitleaks セクションに従ってバイナリを配置してください。

### 誤検知への対処

| ツール | 設定ファイル | 主な対処方法 |
|--------|--------------|---------------|
| Gitleaks | `.gitleaks.toml` | `allowlist.paths` / `allowlist.regexes` に除外パターンを追加 |
| Trivy | (該当パッケージ単位) | `.trivyignore` を作成し CVE ID を 1 行 1 件で列挙 |
| Semgrep | 各ファイル末尾に `// nosemgrep: <rule-id>` コメント | ルール単位 / 行単位で抑制 |

検知された脆弱性は **GitHub Security タブ → Code scanning alerts** から横断的に確認できます。

### Dependabot

- 設定ファイル: `.github/dependabot.yml`
- 毎週月曜朝 09:00 JST に **npm (ルート / frontend/web)、pip (backend/fastapi)、GitHub Actions** の更新 PR をまとめて自動作成します。
- minor / patch は 1 PR にグルーピング、major は除外 (`ignore`) しているため手動対応です。
- 脆弱性アラート (GHSA) はスケジュールを無視して **即時 PR** が立ちます。
- Flutter (pub) / Deno は Dependabot 非対応のため、Trivy + Semgrep で検知し手動更新します。

## トラブルシューティング

### Supabaseが起動しない

```bash
# Dockerコンテナの確認
docker ps

# Supabaseを再起動
cd backend
supabase stop
supabase start
cd ..
```

### マイグレーションエラー

```bash
# データベースをリセット
cd backend
supabase db reset
cd ..

# マイグレーションを再適用
cd backend
supabase db push
cd ..
```

### 型定義が古い

```bash
# 型定義を再生成
npx --yes supabase gen types typescript --schema public --local > backend/supabase/functions/_shared/database.types.ts
npx --yes supabase gen types typescript --schema public --local > frontend/web/src/database.types.ts
```

## 本番環境へのデプロイ

### 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com) でプロジェクトを作成
2. プロジェクトIDとAPIキーを取得

### 2. マイグレーションの適用

```bash
# プロジェクトIDを確認
supabase projects list

# マイグレーション適用
cd backend
supabase db push --project-ref [プロジェクトID]
cd ..

# 型定義生成
npx --yes supabase gen types typescript --schema public --project-ref [プロジェクトID] > backend/supabase/functions/_shared/database.types.ts
```

#### pgroonga 拡張の有効化（全文検索機能を使う場合）

全文検索機能（ToDoのpgroonga検索）は PostgreSQL 拡張 `pgroonga` を使用します。マイグレーションに `CREATE EXTENSION IF NOT EXISTS pgroonga;` を含めているため、Supabase Cloud に対して `supabase db push` を実行すれば基本的に自動で有効化されます。

もし拡張の作成権限エラーが出る場合は、以下のいずれかの方法で事前に有効化してください。

- **Supabase Dashboard**: プロジェクトの Database → Extensions から `pgroonga` を有効化
- **SQL エディタ**: `CREATE EXTENSION IF NOT EXISTS pgroonga;` を実行

> ローカル Supabase（`supabase/postgres` の Docker イメージ）には pgroonga と日本語トークナイザ（MeCab）が同梱されているため、追加インストールは不要です。

##### トークナイザ / ノーマライザの設定

本プロジェクトでは **日本語・英語・数字** に高精度で対応するため、以下の設定で pgroonga インデックスを作成しています:

- `tokenizer='TokenMecab'`
  - 日本語: MeCab による形態素解析（例: 「東京都」→「東京/都」）
  - 英語: スペース・記号で単語単位に分割（例: "Next.js" → "Next/js"）
  - 数字: 連続した数字をひとつのトークンとして扱う
- `normalizer='NormalizerAuto'`
  - 大文字小文字を同一視（"Hello" = "hello"）
  - 全角・半角を同一視（"ＡＢＣ" = "ABC"、"１２３" = "123"）
  - 濁点・半濁点、カナ等の揺らぎを吸収

中国語・韓国語など MeCab が対応しない言語も主要対象に含める場合は、`TokenBigramSplitSymbolAlphaDigit`（バイグラム分割）への切替えを検討してください。

##### 検索クエリの仕組み（複数キーワード AND / フレーズ / LIKE フォールバック）

ToDo 検索 (`search-todos` Edge Function → RPC `sel_todos_search`) は以下の流れで動作します:

1. **トークン化**: 入力文字列を空白で分割し、`"…"` で囲った部分は 1 フレーズとして扱う
   - 入力例: `北海道 札幌 "Next js"` → `["北海道", "札幌", "Next js"]`
2. **Groonga 特殊文字エスケープ**: `"`, `(`, `)`, `\`, `+`, `-`, `>`, `<`, `~`, `*`, `:` を `\` でエスケープ
   （ユーザーが `(値引き)` 等と入力しても構文エラーで落ちないようにするため）
3. **AND 連結**: スペース区切りで連結（Groonga ではスペース＝AND 検索）
4. **LIKE フォールバック**: 同時に生キーワード配列も RPC に渡し、TokenMecab で索き出せない記号や 1 文字英字を AND 部分一致で拾う
5. **関連度ソート**: `pgroonga_score` 降順 → 同点は `created_at` 降順で返却。LIKE フォールバック側はスコア 0

ヘルパは `backend/supabase/functions/_shared/search-query.ts` にあり、他の Edge Function でも `tokenizeSearchInput` / `buildGroongaQuery` / `escapeGroongaSpecialChars` を再利用できます。

### 3. Edge Functionsのデプロイ

```bash
# Edge Functionをデプロイ
cd backend
supabase functions deploy [function-name] --project-ref [プロジェクトID]

# 環境変数を設定
supabase secrets set EDGE_FUNCTION_ALLOWED_ORIGIN=https://yourdomain.com --project-ref [プロジェクトID]
cd ..
```

### 4. Next.jsのデプロイ（Vercel）

```bash
# Vercelにデプロイ
vercel

# 環境変数を設定
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## ライセンス

MIT

## 参考リンク

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Supabase ドキュメント](https://supabase.com/docs)
- [shadcn/ui ドキュメント](https://ui.shadcn.com/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
- [Biome ドキュメント](https://biomejs.dev/)
# zennfes-spring-AmiVoice
