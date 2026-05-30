# AmiVoice × 生成 AI デモ（記事用メモ）

ローカルで `frontend/web` の `/speech` から音声認識・翻訳・履歴を試せます。

## 環境変数（`frontend/web/.env.local`）

| 変数 | 用途 |
| ---- | ---- |
| `NEXT_PUBLIC_SUPABASE_URL` | ローカル Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 公開キー（他機能用） |
| `SUPABASE_SERVICE_ROLE_KEY` | speech の DB 書き込み（BFF のみ） |
| `AMIVOICE_API_KEY` | AmiVoice 同期 HTTP 認識 |
| `LLM_API_KEY` | 英→日翻訳 |
| `LLM_API_BASE_URL` | （任意）OpenAI 互換 API のベース URL |
| `LLM_MODEL` | （任意）デフォルト `gpt-4o-mini` |

## 起動手順

1. `npm run sb:start`（`backend` で Supabase）
2. `npm run sb:reset`（マイグレーション適用）
3. `npm run web:run`
4. ブラウザで http://localhost:3000/speech

## 設計メモ

- ログイン不要。DB は BFF + `service_role` のみ。
- 音声ファイルは DB に保存しない（テキストとメタデータのみ）。
