import { z } from "zod";

/**
 * 共通 Zod スキーマ定義
 * 複数箇所から参照される共有スキーマのみここに定義する
 * 特定機能でのみ使うスキーマは利用ファイルと同じ階層の schema.ts に定義する
 */

/**
 * ToDo優先度の列挙型スキーマ
 */
export const TodoPrioritySchema = z.enum(["low", "medium", "high"]);

/**
 * ToDoステータスの列挙型スキーマ
 */
export const TodoStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

/**
 * ToDoデータのバリデーションスキーマ
 * Database Function sel_todos_by_user の戻り値に対応
 * 画面表示に必要な項目のみ含む
 */
export const TodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: TodoStatusSchema,
  priority: TodoPrioritySchema,
});

/**
 * ToDo検索結果のバリデーションスキーマ
 * Edge Function search-todos の戻り値に対応
 * TodoSchema に pgroonga の関連度スコア (relevance_score) を加えた構造
 *   - pgroonga ヒット時は 0 より大きい値（高いほど関連度が高い）
 *   - LIKE フォールバックでヒットした場合は 0
 */
export const TodoSearchResultSchema = TodoSchema.extend({
  relevance_score: z.number().nullable().optional(),
});

/**
 * ファイルアップロードデータのバリデーションスキーマ
 * Edge Function save-file-record / delete-file-record の戻り値に対応
 */
export const FileUploadSchema = z.object({
  id: z.string().uuid(),
  bucket: z.string().min(1),
  storagePath: z.string().min(1),
  fileName: z.string(),
  originalName: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().nullable(),
  url: z.string().min(1),
});

/**
 * ファイル削除レスポンスのバリデーションスキーマ
 * Edge Function delete-file-record の戻り値に対応
 */
export const FileUploadDeleteSchema = z.object({
  id: z.string().uuid(),
  bucket: z.string().min(1),
  storagePath: z.string().min(1),
  originalName: z.string().min(1),
});
