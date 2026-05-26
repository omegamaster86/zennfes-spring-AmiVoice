# FastAPI Backend

`dev-starter` プロジェクトの Python バックエンド。Next.js や Flutter 向けの汎用 REST API サーバーとして利用します。

Supabase とは独立して動作し、認証はシンプルな **API Key 方式**（`X-API-Key` ヘッダ）を採用しています。

## 技術スタック

- **Python**: 3.12+
- **フレームワーク**: FastAPI
- **パッケージ管理**: [uv](https://docs.astral.sh/uv/)
- **Lint / Format**: Ruff
- **型チェック**: mypy (strict)
- **認証**: API Key（`X-API-Key` ヘッダ、サーバー側の許可リストと定数時間比較）

## ディレクトリ構成

```
backend/fastapi/
├── app/
│   ├── api/
│   │   ├── deps.py          # 依存関係 (API Key 認証・設定)
│   │   └── routes/
│   │       ├── health.py    # GET /api/v1/health        (認証不要)
│   │       └── protected.py # GET /api/v1/protected     (要 API Key)
│   ├── core/
│   │   ├── config.py        # pydantic-settings による設定
│   │   └── security.py      # API Key の定数時間比較
│   ├── schemas/             # Pydantic スキーマ
│   └── main.py              # アプリファクトリ
├── pyproject.toml
├── .python-version
├── .env.example
└── README.md
```

## セットアップ

### 前提

- Python 3.12 以上
- [uv](https://docs.astral.sh/uv/getting-started/installation/) がインストール済み

### 1. 依存関係のインストール

```powershell
cd backend/fastapi
uv sync
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、`API_KEYS` に有効なキーを設定します。

```powershell
Copy-Item .env.example .env
```

API Key の生成例:

```powershell
# PowerShell
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Git Bash / WSL
openssl rand -hex 32
```

複数のキーを同時に有効化したい場合（ローテーション運用時など）はカンマ区切りで設定します。

```
API_KEYS=key-for-web-app,key-for-mobile-app,old-key-scheduled-to-remove
```

### 3. 開発サーバーの起動

```powershell
cd backend/fastapi
uv run fastapi dev app/main.py
```

- API: http://localhost:8000
- OpenAPI ドキュメント: http://localhost:8000/docs
- Redoc: http://localhost:8000/redoc

## エンドポイント

| Method | Path                 | 認証        | 説明                                |
| ------ | -------------------- | ----------- | ----------------------------------- |
| GET    | `/api/v1/health`     | 不要        | ヘルスチェック                      |
| GET    | `/api/v1/protected`  | `X-API-Key` | API Key 認証の動作確認用サンプル    |

### 認証付きリクエスト例

```bash
curl http://localhost:8000/api/v1/protected \
  -H "X-API-Key: dev-local-key-please-change-me"
```

### Next.js からの呼び出し例（サーバーサイドのみ）

API Key はクライアントに露出させてはいけません。Route Handler / Server Action などサーバー側から呼び出してください。

```ts
// frontend/web/src/app/api/some-proxy/route.ts など
const res = await fetch(`${process.env.FASTAPI_BASE_URL}/api/v1/protected`, {
  headers: {
    "X-API-Key": process.env.FASTAPI_API_KEY ?? "",
  },
  cache: "no-store",
});
```

## 開発用コマンド

```powershell
# Lint
uv run ruff check .

# Format
uv run ruff format .

# 型チェック
uv run mypy app

# 本番相当で起動
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 認証設計メモ

- **API Key の検証は `hmac.compare_digest` による定数時間比較**
  - `app/core/security.py` 参照。タイミング攻撃への基本対策
- **キーのローテーション**
  - `API_KEYS` に旧キーと新キーを両方並べ、切替完了後に旧キーを削除
- **複数クライアントの識別**
  - クライアント単位でキーを分けると失効・監査が容易
- **より高度な要件が出た場合**
  - 利用者単位のレート制限・失効が必要なら、DB でキーを管理する実装に拡張（ハッシュ保存・prefix だけログ出力、など）
  - エンドユーザー個別の認可が必要になったら、Supabase JWT 検証や OAuth2 と併用する構成も検討可能

## トラブルシューティング

### 401 Unauthorized が返る

- リクエストに `X-API-Key` ヘッダが付いているか確認
- ヘッダの値が `.env` の `API_KEYS` に含まれているか確認（前後の空白にも注意）
- サーバー再起動直後に反映されない場合は `uv run fastapi dev` を再起動

### 500 "API_KEYS is not configured on the server"

- `.env` に `API_KEYS` が設定されていない、または空です
- 少なくとも 1 つの有効なキーを設定してください

### CORS エラーが出る

`.env` の `CORS_ALLOW_ORIGINS` にフロントエンドのオリジンを追加してください（カンマ区切り）。

```
CORS_ALLOW_ORIGINS=http://localhost:3000,https://your-production-domain.example.com
```
