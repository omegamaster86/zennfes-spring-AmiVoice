# フェーズ2: 変換履歴の要約機能

変換履歴詳細ページ（`/speech/history/[id]`）から、保存済みテキストを LLM で要約する機能の実装メモです。

## 概要

| 項目 | 内容 |
| ---- | ---- |
| 画面 | http://localhost:3000/speech/history/{id} |
| 操作 | 「要約する」ボタンをクリック |
| 要約対象 | `final_text`（表示・保存用の最終テキスト） |
| LLM | OpenAI 互換 API（Gemini / OpenAI など） |
| 保存先 | `t_transcription_record.metadata_json`（JSONB） |

音声ファイル自体は DB に保存していません。AmiVoice 認識 →（必要なら翻訳）→ 保存された **テキスト** を要約します。

## 処理フロー

```
ユーザー
  └─ 「要約する」クリック
       └─ POST /api/speech/history/{id}/summarize
            ├─ レコード取得（getTranscriptionRecordById）
            ├─ metadata_json.summary があればキャッシュ返却
            └─ なければ
                 ├─ summarizeText(final_text)  … Gemini 等
                 └─ updateTranscriptionSummary … DB 保存
```

## 環境変数

フェーズ1（英→日翻訳）と同じ `LLM_*` を流用します。追加の env は不要です。

| 変数 | 用途 |
| ---- | ---- |
| `LLM_API_KEY` | API キー（Gemini は [Google AI Studio](https://aistudio.google.com/) から取得） |
| `LLM_API_BASE_URL` | OpenAI 互換ベース URL |
| `LLM_MODEL` | モデル名 |

Gemini の設定例（`frontend/web/.env.local`）:

```env
LLM_API_KEY=AIza...
LLM_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=gemini-2.0-flash
```

`.env.local` を変更したら Next.js dev サーバーを再起動してください。

## ファイル構成

| 役割 | パス |
| ---- | ---- |
| LLM アダプター | `frontend/web/src/features/speech/adapters/llm-summarizer.ts` |
| DB 更新 | `frontend/web/src/features/speech/adapters/transcription-repository.ts` |
| API Route | `frontend/web/src/app/api/speech/history/[id]/summarize/route.ts` |
| UI（Client） | `frontend/web/src/app/(dashboard)/speech/history/[id]/_components/SummarySection.tsx` |
| 詳細ページ | `frontend/web/src/app/(dashboard)/speech/history/[id]/page.tsx` |
| バリデーション | `frontend/web/src/features/speech/schemas/api-schemas.ts`（`RecordIdParamsSchema`） |

## API 仕様

### `POST /api/speech/history/{id}/summarize`

**リクエスト**

- Body なし
- `id`: UUID（パスパラメータ）

**成功レスポンス（200）**

```json
{
  "summary": "・要点1\n・要点2",
  "summarizedAt": "2026-05-31T12:00:00.000Z",
  "recordId": "019..."
}
```

**エラー**

| ステータス | 条件 |
| ---------- | ---- |
| 400 | ID が UUID 形式でない |
| 404 | レコードが存在しない |
| 502 | LLM エラー（キー未設定、API 失敗、結果が空など） |
| 500 | その他のサーバーエラー |

502 時はレスポンス JSON の `error` フィールドにメッセージが入ります（フェーズ1の翻訳 API と同様）。

## DB 保存形式

専用カラムは追加せず、既存の `metadata_json` にマージします。

```json
{
  "summary": "要約テキスト",
  "summarizedAt": "2026-05-31T12:00:00.000Z"
}
```

- 2 回目以降の POST は LLM を呼ばず、保存済み `summary` を返します（再生成ボタンは未実装）。
- ページ再読み込み時は Server Component が `metadata_json.summary` を読み、Client Component に `initialSummary` として渡します。

## LLM アダプター

`llm-summarizer.ts` は `llm-translator.ts` と同型の fetch 実装です。

- エンドポイント: `${LLM_API_BASE_URL}/chat/completions`
- system プロンプト: 日本語で 3〜5 行に要約（箇条書き可、説明不要）
- temperature: `0.2`
- 入力が空 → `LlmSummarizationError`
- 8000 文字超 → 先頭 8000 文字に truncate（トークン超過防止）

## UI 仕様

詳細ページの「最終テキスト」直下に「要約」セクションを配置しています。

| 状態 | 表示 |
| ---- | ---- |
| 未要約 | 「要約する」ボタン |
| 要約中 | ボタン disabled + 「要約中…」 |
| 成功 | 要約テキスト（border 付きブロック） |
| 失敗 | 赤文字のエラーメッセージ |
| 保存済み | 要約テキストのみ（ボタン非表示） |

クライアントからの呼び出し例:

```typescript
const res = await fetch(`/api/speech/history/${recordId}/summarize`, {
  method: "POST",
});
const data = await res.json();
// data.summary
```

## 手動テスト

1. `/speech` で音声変換し、履歴にレコードを作成する
2. `/speech/history` から任意のレコード詳細を開く
3. 「要約する」をクリック → 要約が表示される
4. ページを再読み込み → 要約がそのまま表示され、ボタンは出ない
5. Supabase Studio 等で `metadata_json.summary` が保存されていることを確認する

## トラブルシューティング

| 症状 | 確認ポイント |
| ---- | ------------ |
| `LLM_API_KEY が設定されていません` | `.env.local` にキーがあるか、dev サーバー再起動 |
| `要約 API がエラーを返しました (401/403)` | API キーの有効性、Gemini API の有効化 |
| `要約 API がエラーを返しました (404)` | `LLM_MODEL` のモデル名が正しいか |
| 502 だが翻訳は動く | 要約と翻訳は同じ env。翻訳が動けばキー自体は有効 |
| 履歴が読めない | Supabase 起動・マイグレーション・`SUPABASE_SERVICE_ROLE_KEY` |

## 設計上の判断

| 判断 | 理由 |
| ---- | ---- |
| `metadata_json` に保存 | マイグレーション不要でデモ規模に十分 |
| キャッシュ返却 | LLM コスト削減、連打防止と併用 |
| Cursor SDK は不採用 | コーディングエージェント向けで、テキスト要約には過剰 |
| 共通 LLM クライアント未抽出 | フェーズ1の `llm-translator.ts` パターンを踏襲しスコープを最小化 |

## 関連ドキュメント

- [README.md](./README.md) … 環境変数・起動手順
- [troubleshooting.md](./troubleshooting.md) … AmiVoice / 翻訳の 502 対策
