# Supabase Edge Functions 共通ユーティリティ

speech デモ向けに最小構成。DB は `t_transcription_record` のみ（アクセスは BFF + `service_role`）。

## ファイル構成

| ファイル | 用途 |
| -------- | ---- |
| `supabase.ts` | Supabase クライアント作成（anon / auth / service_role） |
| `auth.ts` | 認証ユーザー取得 |
| `response.ts` | 標準レスポンスヘルパー |
| `validation.ts` | HTTP メソッド・Authorization ヘッダ検証 |
| `logger.ts` | 構造化ロガー |
| `handler.ts` | Edge Function 共通ハンドラー |
| `database.types.ts` | `t_transcription_record` の型定義 |

## 注意

- speech 機能は Edge Function ではなく Next.js BFF（`/api/speech/*`）経由で DB にアクセスする
- 新規 Edge Function を追加する場合は `_shared` のユーティリティを再利用する
