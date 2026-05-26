/**
 * E2Eテスト用 ToDo データヘルパー
 *
 * テーブル間のデータ整合性を保証しながらテストデータを作成・削除するユーティリティ
 */

/**
 * Supabase設定を取得
 */
function getSupabaseConfig(): {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
} {
  const env =
    (
      globalThis as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env || {};
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url)
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL environment variable is not set.",
    );
  if (!publishableKey)
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable is not set.",
    );
  if (!serviceRoleKey)
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is not set.",
    );

  return { url, publishableKey, serviceRoleKey };
}

/**
 * テストユーザーのt_todoテーブルをクリア
 *
 * @param userId - m_user.id（必須）
 */
export async function cleanupTestTodos(userId: number): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseConfig();

  console.log(`🧹 ユーザー ${userId} のToDoをクリアします...`);

  // ユーザーのToDoを全削除
  const response = await fetch(`${url}/rest/v1/t_todo?user_id=eq.${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete todos: ${response.status} ${errorText}`);
  }

  console.log(`✅ ToDoをクリアしました`);
}

/**
 * ToDoデータの型定義
 */
export interface TodoData {
  title: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high";
  due_date?: string | null;
  completed_at?: string | null;
}

/**
 * テストユーザーのToDoデータを作成
 * @param todos - 作成するToDoデータの配列
 * @param userId - m_user.id（必須）
 */
export async function createTestTodos(
  todos: TodoData[],
  userId: number,
): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const createdProgram = "E2E_TEST";

  console.log(`📝 ${todos.length}件のToDoを作成します...`);

  // ToDoデータを作成
  const todoRecords = todos.map((todo) => ({
    user_id: userId,
    title: todo.title,
    description: todo.description || null,
    status: todo.status || "pending",
    priority: todo.priority || "medium",
    due_date: todo.due_date || null,
    completed_at: todo.completed_at || null,
    created_program: createdProgram,
    updated_program: createdProgram,
  }));

  // データを挿入
  const response = await fetch(`${url}/rest/v1/t_todo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(todoRecords),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to insert todos: ${response.status} ${errorText}`);
  }

  console.log(`✅ ${todos.length}件のToDoを作成しました`);
}

/**
 * 基本的なテストデータセットを作成（5件）
 * @param userId - m_user.id（必須）
 */
export async function createBasicTodos(userId: number): Promise<void> {
  const todos: TodoData[] = [
    {
      title: "週報を作成する",
      description: "先週の活動をまとめて週報を作成",
      status: "pending",
      priority: "high",
      due_date: "2025-10-05T09:00:00Z",
    },
    {
      title: "ミーティング資料の準備",
      description: "来週の定例会議用の資料を準備する",
      status: "in_progress",
      priority: "medium",
      due_date: "2025-10-03T15:00:00Z",
    },
    {
      title: "コードレビュー",
      description: "プルリクエストのレビューを実施",
      status: "completed",
      priority: "low",
      due_date: "2025-09-30T18:00:00Z",
      completed_at: "2025-09-29T16:30:00Z",
    },
    {
      title: "環境構築ドキュメント更新",
      description: "新しい開発環境のセットアップ手順を文書化",
      status: "pending",
      priority: "medium",
      due_date: "2025-10-10T12:00:00Z",
    },
    {
      title: "バグ修正",
      description: "ログイン画面の不具合を修正する",
      status: "in_progress",
      priority: "high",
      due_date: "2025-10-02T17:00:00Z",
    },
  ];

  await createTestTodos(todos, userId);
}

/**
 * 優先度別のテストデータを作成（3件）
 * @param userId - m_user.id（必須）
 */
export async function createPriorityTestTodos(userId: number): Promise<void> {
  const todos: TodoData[] = [
    {
      title: "優先度：高のタスク",
      description: "緊急対応が必要なタスク",
      status: "pending",
      priority: "high",
      due_date: "2025-10-05T09:00:00Z",
    },
    {
      title: "優先度：中のタスク",
      description: "通常の優先度のタスク",
      status: "pending",
      priority: "medium",
      due_date: "2025-10-03T15:00:00Z",
    },
    {
      title: "優先度：低のタスク",
      description: "時間があれば対応するタスク",
      status: "pending",
      priority: "low",
      due_date: "2025-10-10T12:00:00Z",
    },
  ];

  await createTestTodos(todos, userId);
}

/**
 * ユーザーの ToDo 件数を取得する
 * 権限・所有テスト（他ユーザーの ToDo が見えないこと）の検証で使用する。
 *
 * @param userId - m_user.id（必須）
 * @returns 件数
 */
export async function countTestTodos(userId: number): Promise<number> {
  const { url, serviceRoleKey } = getSupabaseConfig();

  const response = await fetch(
    `${url}/rest/v1/t_todo?user_id=eq.${userId}&select=id`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        Prefer: "count=exact",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to count todos: ${response.status} ${errorText}`);
  }

  const rows = (await response.json()) as unknown[];
  return rows.length;
}

/**
 * 指定文字数の ASCII 文字列を生成する（境界値テスト用）
 *
 * @param length - 生成する文字数
 * @param char - 1 文字分の繰り返し文字（デフォルト: "a"）
 * @returns 指定長の文字列
 */
export function buildLongString(length: number, char = "a"): string {
  return char.repeat(length);
}

/**
 * ステータス別のテストデータを作成（4件）
 * @param userId - m_user.id（必須）
 */
export async function createStatusTestTodos(userId: number): Promise<void> {
  const todos: TodoData[] = [
    {
      title: "未着手のタスク",
      description: "まだ開始していないタスク",
      status: "pending",
      priority: "medium",
      due_date: "2025-10-05T09:00:00Z",
    },
    {
      title: "進行中のタスク",
      description: "現在作業中のタスク",
      status: "in_progress",
      priority: "medium",
      due_date: "2025-10-03T15:00:00Z",
    },
    {
      title: "完了したタスク",
      description: "既に完了したタスク",
      status: "completed",
      priority: "medium",
      due_date: "2025-09-30T18:00:00Z",
      completed_at: "2025-09-29T16:30:00Z",
    },
    {
      title: "キャンセルしたタスク",
      description: "中止したタスク",
      status: "cancelled",
      priority: "medium",
      due_date: "2025-10-10T12:00:00Z",
    },
  ];

  await createTestTodos(todos, userId);
}
