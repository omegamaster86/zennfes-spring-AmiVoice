// Deno/Supabase Functions固有のヘルパーをインポート
import {
  assertErrorResponse,
  assertErrorShape,
  assertResponseTime,
  assertSuccessShape,
  buildEndpointUrl,
  logNon200Response,
  makeRawRequest,
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

// 型定義: ins_todo の戻り値の型（拡張版）
type InsertedTodo =
  Database["public"]["Functions"]["ins_todo"]["Returns"][number];

// UUID v7 形式（8-4-4-4-12、バージョン=7、バリアント=8/9/a/b）
const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// テスト対象の関数名
const FUNCTION_NAME = "create-todo";

// テスト用ユーザー情報
const TEST_USER = {
  email: "test-create-todo@example.com",
  password: "TestPassword123!",
};

/**
 * テストユーザーのToDo を削除
 */
async function cleanupTestTodos(
  mUserId: string,
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.from("t_todo").delete().eq("user_id", mUserId);
}

Deno.test("create-todo - GET で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("GET で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "GET");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("GET で呼ぶと 405 Method not allowed が返る");
});

Deno.test("create-todo - PUT で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("PUT で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "PUT");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("PUT で呼ぶと 405 Method not allowed が返る");
});

Deno.test("create-todo - DELETE で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("DELETE で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "DELETE");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("DELETE で呼ぶと 405 Method not allowed が返る");
});

Deno.test({
  name: "create-todo - 認証ヘッダーなしで POST すると 401 が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("認証ヘッダーなしで POST すると 401 が返る");
    const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

    // Authorizationヘッダーなしでリクエスト
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "テストToDo",
      }),
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
    logTestEnd("認証ヘッダーなしで POST すると 401 が返る");
  },
});

Deno.test({
  name: "create-todo - 無効なトークンで POST すると 401 が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("無効なトークンで POST すると 401 が返る");
    const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

    // 無効なトークンでリクエスト
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({
        title: "テストToDo",
      }),
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
    logTestEnd("無効なトークンで POST すると 401 が返る");
  },
});

Deno.test({
  name:
    "create-todo - title フィールドなしで作成すると 400 VALIDATION_ERROR が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "title フィールドなしで作成すると 400 VALIDATION_ERROR が返る",
    );

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // titleなしでリクエスト
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          description: "説明のみ",
        }),
      });

      await logNon200Response(response.clone());

      // titleがない場合は400エラー
      assertEquals(response.status, 400);

      const data = await response.json();
      // 観点 #5（エラー設計）/ #9（契約）: エラー DTO の形状を検証
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("title フィールドなしで作成すると 400 VALIDATION_ERROR が返る");
  },
});

Deno.test({
  name: "create-todo - title が空文字で作成すると 400 VALIDATION_ERROR が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("title が空文字で作成すると 400 VALIDATION_ERROR が返る");

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // title空文字でリクエスト
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: "",
          description: "説明",
        }),
      });

      await logNon200Response(response.clone());

      // title空文字の場合は400エラー
      assertEquals(response.status, 400);

      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
      assertEquals(data.error.message, "title is required");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("title が空文字で作成すると 400 VALIDATION_ERROR が返る");
  },
});

Deno.test({
  name:
    "create-todo - title が空白のみで作成すると trim 後に空文字となり 400 が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "title が空白のみで作成すると trim 後に空文字となり 400 が返る",
    );

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // title空白文字のみでリクエスト
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: "   ",
          description: "説明",
        }),
      });

      await logNon200Response(response.clone());

      // title空白文字のみの場合は trim 後に空文字となり 400 エラー
      assertEquals(response.status, 400);

      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
      assertEquals(data.error.message, "title is required");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("title が空白のみで作成すると trim 後に空文字となり 400 が返る");
  },
});

Deno.test({
  name:
    "create-todo - title のみ指定で作成すると priority=medium / status=pending の既定値で保存される",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "title のみ指定で作成すると priority=medium / status=pending の既定値で保存される",
    );

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // titleのみでリクエスト
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: "最小限のToDo",
        }),
      });

      await logNon200Response(response.clone());

      // 正常に作成された場合は201ステータス
      assertEquals(response.status, 201);

      const result = await response.json();
      // 観点 #9（契約）: レスポンス DTO の必須項目を検証
      assertSuccessShape(result, ["id", "title", "priority", "status"]);

      const data = result.data as InsertedTodo;

      // レスポンスの検証（id は UUID v7 文字列）
      assertEquals(typeof data.id, "string");
      assert(
        UUID_V7_REGEX.test(data.id),
        `id は UUID v7 形式であるべき: ${data.id}`,
      );
      assertEquals(data.title, "最小限のToDo");

      // デフォルト値の検証
      assertEquals(data.priority, "medium", "priorityのデフォルトはmedium");
      assertEquals(data.status, "pending", "statusのデフォルトはpending");

      // オプショナルフィールドの検証
      assertEquals(data.description, null, "descriptionはnull");

      // 作成されたToDoを確認
      const { data: todos, error: selectError } = await supabase
        .from("t_todo")
        .select("*")
        .eq("user_id", mUserId);

      assert(!selectError, "ToDoの取得に成功するべき");
      assertEquals(todos?.length, 1, "1件のToDoが作成されているべき");
      assertEquals(todos?.[0].title, "最小限のToDo");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "title のみ指定で作成すると priority=medium / status=pending の既定値で保存される",
    );
  },
});

Deno.test({
  name:
    "create-todo - 全フィールドを指定して作成すると指定値どおりに保存される",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("全フィールドを指定して作成すると指定値どおりに保存される");

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // 全フィールドでリクエスト
      const todoData = {
        title: "完全なToDo",
        description: "詳細な説明",
        priority: "high",
        dueDate: "2025-12-31",
      };

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(todoData),
      });

      await logNon200Response(response.clone());

      // 正常に作成された場合は201ステータス
      assertEquals(response.status, 201);

      const result = await response.json();
      assert(result.success === true, "successはtrueであるべき");

      const data = result.data as InsertedTodo;
      assertExists(data, "dataが存在するべき");

      // レスポンスの検証（id は UUID v7 文字列）
      assertExists(data.id);
      assertEquals(typeof data.id, "string");
      assert(
        UUID_V7_REGEX.test(data.id),
        `id は UUID v7 形式であるべき: ${data.id}`,
      );
      assertEquals(data.title, todoData.title);
      assertEquals(data.description, todoData.description);
      assertEquals(data.priority, todoData.priority);
      assertEquals(data.status, "pending");

      // 作成されたToDoを確認
      const { data: todos, error: selectError } = await supabase
        .from("t_todo")
        .select("*")
        .eq("user_id", mUserId);

      assert(!selectError, "ToDoの取得に成功するべき");
      assertEquals(todos?.length, 1, "1件のToDoが作成されているべき");
      assertEquals(todos?.[0].title, todoData.title);
      assertEquals(todos?.[0].description, todoData.description);
      assertEquals(todos?.[0].priority, todoData.priority);
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("全フィールドを指定して作成すると指定値どおりに保存される");
  },
});

Deno.test({
  name:
    'create-todo - priority="low" を指定して作成すると返却 DTO の priority が low になる',
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      'priority="low" を指定して作成すると返却 DTO の priority が low になる',
    );

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: "低優先度のToDo",
          priority: "low",
        }),
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 201);
      const result = await response.json();
      const data = result.data as InsertedTodo;

      assertEquals(data.priority, "low");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      'priority="low" を指定して作成すると返却 DTO の priority が low になる',
    );
  },
});

Deno.test({
  name:
    "create-todo - 同一ユーザーが連続で 3 件作成すると全件が DB に保存される",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("同一ユーザーが連続で 3 件作成すると全件が DB に保存される");

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // 3件のToDoを連続で作成
      const todos = [
        { title: "ToDo 1", priority: "low" },
        { title: "ToDo 2", priority: "medium" },
        { title: "ToDo 3", priority: "high" },
      ];

      for (const todo of todos) {
        const response = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(todo),
        });

        assertEquals(response.status, 201, `${todo.title}の作成に成功するべき`);
        const result = await response.json();
        assert(result.success === true);
      }

      // 作成されたToDoを確認
      const { data: createdTodos, error: selectError } = await supabase
        .from("t_todo")
        .select("*")
        .eq("user_id", mUserId)
        .order("created_at", { ascending: true });

      assert(!selectError, "ToDoの取得に成功するべき");
      assertEquals(createdTodos?.length, 3, "3件のToDoが作成されているべき");

      // 各ToDoの検証
      assertEquals(createdTodos?.[0].title, "ToDo 1");
      assertEquals(createdTodos?.[0].priority, "low");
      assertEquals(createdTodos?.[1].title, "ToDo 2");
      assertEquals(createdTodos?.[1].priority, "medium");
      assertEquals(createdTodos?.[2].title, "ToDo 3");
      assertEquals(createdTodos?.[2].priority, "high");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("同一ユーザーが連続で 3 件作成すると全件が DB に保存される");
  },
});

Deno.test({
  name:
    "create-todo - 別ユーザーが同時に作成しても各々の user_id 配下にのみ保存される",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "別ユーザーが同時に作成しても各々の user_id 配下にのみ保存される",
    );

    // テストユーザー1を作成
    const testUser1 = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    // テストユーザー2を作成（異なるメールアドレス）
    const testUser2 = await createTestUser(
      "test-create-todo-2@example.com",
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // ユーザー1がToDoを作成
      const response1 = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUser1.accessToken}`,
        },
        body: JSON.stringify({
          title: "ユーザー1のToDo",
        }),
      });

      assertEquals(response1.status, 201);

      // ユーザー2がToDoを作成
      const response2 = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUser2.accessToken}`,
        },
        body: JSON.stringify({
          title: "ユーザー2のToDo",
        }),
      });

      assertEquals(response2.status, 201);

      // ユーザー1のToDoを確認
      const { data: user1Todos } = await testUser1.supabase
        .from("t_todo")
        .select("*")
        .eq("user_id", testUser1.mUserId);

      assertEquals(user1Todos?.length, 1, "ユーザー1は1件のToDoを持つべき");
      assertEquals(user1Todos?.[0].title, "ユーザー1のToDo");

      // ユーザー2のToDoを確認
      const { data: user2Todos } = await testUser2.supabase
        .from("t_todo")
        .select("*")
        .eq("user_id", testUser2.mUserId);

      assertEquals(user2Todos?.length, 1, "ユーザー2は1件のToDoを持つべき");
      assertEquals(user2Todos?.[0].title, "ユーザー2のToDo");
    } finally {
      // クリーンアップ
      await cleanupTestTodos(testUser1.mUserId, testUser1.supabase);
      await cleanupTestTodos(testUser2.mUserId, testUser2.supabase);
      await cleanupTestUser(testUser1.authUserId, testUser1.supabase);
      await cleanupTestUser(testUser2.authUserId, testUser2.supabase);
    }
    logTestEnd(
      "別ユーザーが同時に作成しても各々の user_id 配下にのみ保存される",
    );
  },
});

Deno.test({
  name: "create-todo - 全フィールド指定で作成しても 3 秒以内に応答が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("全フィールド指定で作成しても 3 秒以内に応答が返る");

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // レスポンス時間を計測
      const startTime = Date.now();
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: "レスポンス時間測定用ToDo",
          description: "パフォーマンステスト",
          priority: "high",
          dueDate: "2025-12-31",
        }),
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // レスポンス時間が3秒以内であることを確認
      assertResponseTime(responseTime, 3000);
      assertEquals(response.status, 201);

      const result = await response.json();
      assert(result.success === true);
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("全フィールド指定で作成しても 3 秒以内に応答が返る");
  },
});

Deno.test({
  name:
    "create-todo - 255 文字の title で作成すると 201 で受理される（境界内）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("255 文字の title で作成すると 201 で受理される（境界内）");

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // 255文字のtitle
      const longTitle = "あ".repeat(255);

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: longTitle,
        }),
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 201);
      const result = await response.json();
      const data = result.data as InsertedTodo;

      assertEquals(data.title, longTitle);
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("255 文字の title で作成すると 201 で受理される（境界内）");
  },
});

Deno.test({
  name:
    "create-todo - 1000 文字の description で作成すると 201 で受理される（境界内）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "1000 文字の description で作成すると 201 で受理される（境界内）",
    );

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // 1000文字のdescription
      const longDescription = "あ".repeat(1000);

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: "長い説明のToDo",
          description: longDescription,
        }),
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 201);
      const result = await response.json();
      const data = result.data as InsertedTodo;

      assertEquals(data.description, longDescription);
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "1000 文字の description で作成すると 201 で受理される（境界内）",
    );
  },
});

Deno.test({
  name:
    "create-todo - 特殊文字を含む title で作成すると保存値はエスケープされず原文のまま返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "特殊文字を含む title で作成すると保存値はエスケープされず原文のまま返る",
    );

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

      // 特殊文字を含むtitle
      const specialTitle =
        "📝 ToDo <script>alert('XSS')</script> & \"test\" 'test'";

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: specialTitle,
        }),
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 201);
      const result = await response.json();
      const data = result.data as InsertedTodo;

      // 特殊文字がそのまま保存されていることを確認
      assertEquals(data.title, specialTitle);
    } finally {
      // クリーンアップ
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "特殊文字を含む title で作成すると保存値はエスケープされず原文のまま返る",
    );
  },
});

// ============================================================
// 観点 #1（入力 / 契約）: 不正な priority enum 値・不正型ボディ
// ============================================================

Deno.test({
  name:
    'create-todo - priority に未知の値 "urgent" を指定すると 400 VALIDATION_ERROR が返る',
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      'priority に未知の値 "urgent" を指定すると 400 VALIDATION_ERROR が返る',
    );

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: "未知 priority",
          priority: "urgent",
        }),
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });

      // DB にも作成されていないこと
      const { data: rows } = await supabase
        .from("t_todo")
        .select("id")
        .eq("user_id", mUserId);
      assertEquals(
        rows?.length ?? 0,
        0,
        "未知 priority では DB に保存されない",
      );
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      'priority に未知の値 "urgent" を指定すると 400 VALIDATION_ERROR が返る',
    );
  },
});

Deno.test({
  name:
    "create-todo - リクエストボディが配列で送られると 400 VALIDATION_ERROR が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "リクエストボディが配列で送られると 400 VALIDATION_ERROR が返る",
    );

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const response = await makeRawRequest(
        FUNCTION_NAME,
        "POST",
        JSON.stringify([{ title: "配列ボディ" }]),
        { Authorization: `Bearer ${accessToken}` },
      );
      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "リクエストボディが配列で送られると 400 VALIDATION_ERROR が返る",
    );
  },
});

Deno.test({
  name:
    "create-todo - リクエストボディが数値で送られると 400 VALIDATION_ERROR が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "リクエストボディが数値で送られると 400 VALIDATION_ERROR が返る",
    );

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const response = await makeRawRequest(FUNCTION_NAME, "POST", "123", {
        Authorization: `Bearer ${accessToken}`,
      });
      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "リクエストボディが数値で送られると 400 VALIDATION_ERROR が返る",
    );
  },
});

Deno.test({
  name:
    "create-todo - リクエストボディが null で送られると 400 VALIDATION_ERROR が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "リクエストボディが null で送られると 400 VALIDATION_ERROR が返る",
    );

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const response = await makeRawRequest(FUNCTION_NAME, "POST", "null", {
        Authorization: `Bearer ${accessToken}`,
      });
      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "リクエストボディが null で送られると 400 VALIDATION_ERROR が返る",
    );
  },
});
