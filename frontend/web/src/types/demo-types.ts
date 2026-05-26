/**
 * デモアプリケーション用の型定義
 *
 * モックストアを使用したデモアプリで使用する型を定義します。
 * 本番のデータベース型とは異なり、シンプルで柔軟な構造になっています。
 */

// ============================================
// Mock TODO型定義
// ============================================

/**
 * モックTODOの型定義
 */
export type MockTodo = {
  id: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
};

// ============================================
// 汎用レスポンス型
// ============================================

/**
 * Server Actionsの汎用レスポンス型
 *
 * @template T - レスポンスデータの型
 */
export type ActionResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
};
