/**
 * 型定義のエクスポート
 * このファイルから型をインポートすることを推奨
 *
 * 特定機能でのみ使うスキーマ・型は利用ファイルと同じ階層の schema.ts に定義する
 */

import type { z } from "zod";
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";
import type {
  FileUploadSchema,
  TodoSchema,
  TodoSearchResultSchema,
} from "./schemas";

// ============================================
// database.types.ts ベースの型定義
// ============================================

export type { Database };

export type User = Tables<"m_user">;
export type UserInsert = TablesInsert<"m_user">;
export type UserUpdate = TablesUpdate<"m_user">;

export type Todo = Tables<"t_todo">;
export type TodoInsert = TablesInsert<"t_todo">;
export type TodoUpdate = TablesUpdate<"t_todo">;

export type FileUpload = Tables<"t_file_upload">;
export type FileUploadInsert = TablesInsert<"t_file_upload">;
export type FileUploadUpdate = TablesUpdate<"t_file_upload">;

/**
 * ToDo APIレスポンスの型定義
 * Database Function（sel_todos_by_user, ins_todoなど）から返される限定されたフィールド
 */
export type TodoApi = z.infer<typeof TodoSchema>;

/**
 * ToDo検索結果の型定義
 * Edge Function `search-todos` から返される検索結果（relevance_score 含む）
 */
export type TodoSearchResult = z.infer<typeof TodoSearchResultSchema>;

/**
 * ファイルアップロード APIレスポンスの型定義
 * Edge Function（save-file-record）から返されるフィールド
 */
export type FileUploadApi = z.infer<typeof FileUploadSchema>;

/**
 * ToDo優先度の型定義
 */
export type TodoPriority = "low" | "medium" | "high";

/**
 * ToDoステータスの型定義
 */
export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";

// ============================================
// 共通 Zod スキーマ（バリデーション用）
// ============================================

export {
  FileUploadDeleteSchema,
  FileUploadSchema,
  TodoPrioritySchema,
  TodoSchema,
  TodoSearchResultSchema,
  TodoStatusSchema,
} from "./schemas";

// ============================================
// デモアプリケーション用型定義
// ============================================

export type { ActionResponse, MockTodo } from "./demo-types";
