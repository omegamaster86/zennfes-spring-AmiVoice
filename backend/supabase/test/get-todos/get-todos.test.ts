// Deno/Supabase Functions固有のヘルパーをインポート
import {
  assertErrorResponse,
  assertResponseTime,
  assertSuccessShape,
  buildEndpointUrl,
  logNon200Response,
  makeRequest,
} from "@shared/deno-helpers.ts";
// 共通テストヘルパーをインポート
import { logTestEnd, logTestStart } from "@shared/test-helpers.ts";
// ユーザー管理ヘルパーをインポート
import { cleanupTestUser, createTestUser } from "@shared/user-helpers.ts";
import { assert, assertEquals, assertExists } from "@std/assert";
// Supabaseクライアントのインポート
import type { SupabaseClient } from "@supabase/client";
// Database型定義をインポート
import type { Database } from "@supabase-shared/database.types.ts";

// 型定義: sel_todos_by_user の戻り値の型
type TodoItem =
  Database["public"]["Functions"]["sel_todos_by_user"]["Returns"][number];

// UUID v7 形式（8-4-4-4-12、バージョン=7、バリアント=8/9/a/b）
const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// テスト対象の関数名
const FUNCTION_NAME = "get-todos";

// テスト用ユーザー情報
const TEST_USER = {
  email: "test-get-todos@example.com",
  password: "TestPassword123!",
};

/**
 * テストユーザーのToDo データを作成
 */
async function createTestTodos(
  mUserId: string,
  supabase: SupabaseClient,
  count: number,
  createdProgram: string,
): Promise<void> {
  const todos = [];
  for (let i = 1; i <= count; i++) {
    todos.push({
      user_id: mUserId, // m_user.id への参照
      title: `テストToDo ${i}`,
      description: `テストToDo ${i} の説明`,
      status: i % 2 === 0 ? "completed" : "pending", // 偶数番目は完了済み
      created_program: createdProgram,
      updated_program: createdProgram,
    });
  }

  const { error } = await supabase.from("t_todo").insert(todos);
  if (error) {
    throw new Error(`ToDoデータの挿入に失敗しました: ${error.message}`);
  }
}

/**
 * テストユーザーのToDo を削除
 */
async function cleanupTestTodos(
  mUserId: string,
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.from("t_todo").delete().eq("user_id", mUserId);
}

Deno.test("get-todos - POST で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("POST で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "POST");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("POST で呼ぶと 405 Method not allowed が返る");
});

Deno.test("get-todos - PUT で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("PUT で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "PUT");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("PUT で呼ぶと 405 Method not allowed が返る");
});

Deno.test("get-todos - DELETE で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("DELETE で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "DELETE");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("DELETE で呼ぶと 405 Method not allowed が返る");
});

Deno.test({
  name: "get-todos - 認証ヘッダーなしで呼ぶと 401 が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("認証ヘッダーなしで呼ぶと 401 が返る");
    const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

    // Authorizationヘッダーなしでリクエスト
    const response = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    await logNon200Response(response.clone());

    // 認証ヘッダーがない場合は401エラー
    assertEquals(response.status, 401);

    const data = await response.json();
    // レスポンス構造を確認（success: false, error: "..." の形式）
    assert(
      data.success === false || data.msg !== undefined,
      "エラーレスポンスが存在するべき",
    );
    logTestEnd("認証ヘッダーなしで呼ぶと 401 が返る");
  },
});

Deno.test({
  name: "get-todos - 無効なトークンで呼ぶと 401 が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("無効なトークンで呼ぶと 401 が返る");
    const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

    // 無効なトークンでリクエスト
    const response = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
    });

    await logNon200Response(response.clone());

    // 無効なトークンの場合は401エラー
    assertEquals(response.status, 401);

    const data = await response.json();
    // レスポンス構造を確認（success: false, error: "..." の形式）
    assert(
      data.success === false || data.msg !== undefined,
      "エラーレスポンスが存在するべき",
    );
    logTestEnd("無効なトークンで呼ぶと 401 が返る");
  },
});

Deno.test({
  name: "get-todos - 認証済みユーザーが取得すると自分の ToDo 3 件が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("認証済みユーザーが取得すると自分の ToDo 3 件が返る");

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // テストToDo を3件作成
      await createTestTodos(mUserId, supabase, 3, FUNCTION_NAME);

      // 認証トークン付きでリクエスト
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const result = await response.json();

      // 観点 #9（契約）: レスポンス DTO の必須項目を検証
      assertSuccessShape(result, ["id", "title", "status", "priority"]);

      const data = result.data as TodoItem[];

      // レスポンスの検証
      assert(Array.isArray(data), "レスポンスは配列であるべき");
      assertEquals(data.length, 3, "3件のToDoが返されるべき");

      // 各ToDoの検証
      for (const todo of data) {
        assertExists(todo.id);
        assertExists(todo.title);
        assertExists(todo.status);
        assertExists(todo.priority);

        // 型の検証（id は UUID v7 文字列）
        assertEquals(typeof todo.id, "string");
        assert(
          UUID_V7_REGEX.test(todo.id),
          `id は UUID v7 形式であるべき: ${todo.id}`,
        );
        assertEquals(typeof todo.title, "string");
        assertEquals(typeof todo.status, "string");
        assertEquals(typeof todo.priority, "string");

        // description は null の可能性がある
        assert(
          todo.description === null || typeof todo.description === "string",
        );

        // status の値の検証
        assert(
          ["pending", "in_progress", "completed", "cancelled"].includes(
            todo.status,
          ),
          `statusは有効な値であるべき: ${todo.status}`,
        );

        // priority の値の検証
        assert(
          ["low", "medium", "high"].includes(todo.priority),
          `priorityは有効な値であるべき: ${todo.priority}`,
        );
      }

      // タイトルの検証
      const titles = data.map((todo) => todo.title);
      assert(titles.includes("テストToDo 1"));
      assert(titles.includes("テストToDo 2"));
      assert(titles.includes("テストToDo 3"));
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("認証済みユーザーが取得すると自分の ToDo 3 件が返る");
  },
});

Deno.test({
  name: "get-todos - ToDo を持たないユーザーが取得すると空配列が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("ToDo を持たないユーザーが取得すると空配列が返る");

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // ToDoは作成しない

      // 認証トークン付きでリクエスト
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const result = await response.json();
      const data = result.data as TodoItem[];

      // レスポンスの検証
      assert(Array.isArray(data), "レスポンスは配列であるべき");
      assertEquals(data.length, 0, "0件のToDoが返されるべき");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("ToDo を持たないユーザーが取得すると空配列が返る");
  },
});

Deno.test({
  name: "get-todos - 完了/未完了が混在する 10 件で取得すると全件が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("完了/未完了が混在する 10 件で取得すると全件が返る");

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // テストToDo を10件作成（偶数番目は完了済み）
      await createTestTodos(mUserId, supabase, 10, FUNCTION_NAME);

      // 認証トークン付きでリクエスト
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const result = await response.json();
      const data = result.data as TodoItem[];

      // レスポンスの検証
      assert(Array.isArray(data), "レスポンスは配列であるべき");
      assertEquals(data.length, 10, "10件のToDoが返されるべき");

      // 完了済みと未完了のToDoが混在していることを確認
      const completedCount = data.filter(
        (todo) => todo.status === "completed",
      ).length;
      const uncompletedCount = data.filter(
        (todo) => todo.status !== "completed",
      ).length;

      assertEquals(completedCount, 5, "完了済みToDoは5件であるべき");
      assertEquals(uncompletedCount, 5, "未完了ToDoは5件であるべき");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("完了/未完了が混在する 10 件で取得すると全件が返る");
  },
});

Deno.test({
  name:
    "get-todos - 別ユーザーで取得すると自分の ToDo のみが返る（テナント境界）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "別ユーザーで取得すると自分の ToDo のみが返る（テナント境界）",
    );

    // テストユーザー1を作成
    const testUser1 = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    // テストユーザー2を作成（異なるメールアドレス）
    const testUser2 = await createTestUser(
      "test-get-todos-2@example.com",
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // ユーザー1のToDoを3件作成
      await createTestTodos(
        testUser1.mUserId,
        testUser1.supabase,
        3,
        FUNCTION_NAME,
      );

      // ユーザー2のToDoを5件作成
      await createTestTodos(
        testUser2.mUserId,
        testUser2.supabase,
        5,
        FUNCTION_NAME,
      );

      // ユーザー1のトークンでリクエスト
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response1 = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUser1.accessToken}`,
        },
      });

      await logNon200Response(response1.clone());

      assertEquals(response1.status, 200);
      const result1 = await response1.json();
      const data1 = result1.data as TodoItem[];

      // ユーザー1は自分のToDoのみ取得できる
      assertEquals(data1.length, 3, "ユーザー1は3件のToDoを取得できるべき");

      // ユーザー2のトークンでリクエスト
      const response2 = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUser2.accessToken}`,
        },
      });

      await logNon200Response(response2.clone());

      assertEquals(response2.status, 200);
      const result2 = await response2.json();
      const data2 = result2.data as TodoItem[];

      // ユーザー2は自分のToDoのみ取得できる
      assertEquals(data2.length, 5, "ユーザー2は5件のToDoを取得できるべき");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(testUser1.mUserId, testUser1.supabase);
      await cleanupTestTodos(testUser2.mUserId, testUser2.supabase);
      await cleanupTestUser(testUser1.authUserId, testUser1.supabase);
      await cleanupTestUser(testUser2.authUserId, testUser2.supabase);
    }
    logTestEnd("別ユーザーで取得すると自分の ToDo のみが返る（テナント境界）");
  },
});

Deno.test({
  name: "get-todos - 100 件登録された状態で取得しても 3 秒以内に返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("100 件登録された状態で取得しても 3 秒以内に返る");

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // テストToDo を100件作成
      await createTestTodos(mUserId, supabase, 100, FUNCTION_NAME);

      // レスポンス時間を計測
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const startTime = Date.now();
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // レスポンス時間が3秒以内であることを確認
      assertResponseTime(responseTime, 3000);
      assertEquals(response.status, 200);

      const result = await response.json();
      const data = result.data as TodoItem[];
      assertEquals(data.length, 100, "100件のToDoが返されるべき");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("100 件登録された状態で取得しても 3 秒以内に返る");
  },
});

Deno.test({
  name:
    "get-todos - 1 件登録した ToDo を取得すると保存値どおりのフィールドが返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "1 件登録した ToDo を取得すると保存値どおりのフィールドが返る",
    );

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // 特定のToDoを作成
      const specificTodo = {
        user_id: mUserId, // m_user.id への参照
        title: "詳細検証用ToDo",
        description: "これは詳細検証用のToDoです",
        status: "pending",
        created_program: FUNCTION_NAME,
        updated_program: FUNCTION_NAME,
      };

      const { error } = await supabase.from("t_todo").insert([specificTodo]);
      if (error) {
        throw new Error(`ToDoデータの挿入に失敗しました: ${error.message}`);
      }

      // 認証トークン付きでリクエスト
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const result = await response.json();
      const data = result.data as TodoItem[];

      // レスポンスの検証
      assert(Array.isArray(data), "レスポンスは配列であるべき");
      assertEquals(data.length, 1, "1件のToDoが返されるべき");

      const todo = data[0];

      // 各フィールドの詳細検証（id は UUID v7 文字列）
      assertExists(todo.id);
      assertEquals(typeof todo.id, "string");
      assert(
        UUID_V7_REGEX.test(todo.id),
        `id は UUID v7 形式であるべき: ${todo.id}`,
      );

      assertEquals(todo.title, "詳細検証用ToDo");
      assertEquals(todo.description, "これは詳細検証用のToDoです");
      assertEquals(todo.status, "pending");
      assertEquals(todo.priority, "medium");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("1 件登録した ToDo を取得すると保存値どおりのフィールドが返る");
  },
});

// ============================================================
// 観点 #8: データ整合（論理削除の扱い）
// ============================================================

Deno.test({
  name: "get-todos - 論理削除済み ToDo は取得結果に含まれない",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("論理削除済み ToDo は取得結果に含まれない");

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // 3 件作成し、そのうち 1 件を論理削除する
      await createTestTodos(mUserId, supabase, 3, FUNCTION_NAME);

      const { error: updateError } = await supabase
        .from("t_todo")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", mUserId)
        .eq("title", "テストToDo 2");
      assert(!updateError, "論理削除に成功するべき");

      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const result = await response.json();
      const data = result.data as TodoItem[];

      // 論理削除した 1 件は含まれず、残り 2 件のみ返る
      assertEquals(data.length, 2, "論理削除済みを除いた 2 件が返るべき");
      const titles = data.map((todo) => todo.title);
      assert(
        !titles.includes("テストToDo 2"),
        "論理削除した ToDo は含まれないべき",
      );
      assert(titles.includes("テストToDo 1"));
      assert(titles.includes("テストToDo 3"));
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("論理削除済み ToDo は取得結果に含まれない");
  },
});
