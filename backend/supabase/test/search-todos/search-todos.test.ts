// Deno/Supabase Functions固有のヘルパーをインポート
import {
  assertErrorResponse,
  assertErrorShape,
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
import { assert, assertEquals } from "@std/assert";
// Supabaseクライアントのインポート
import type { SupabaseClient } from "@supabase/client";

// UUID v7 形式（8-4-4-4-12、バージョン=7、バリアント=8/9/a/b）
const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// テスト対象の関数名
const FUNCTION_NAME = "search-todos";

// テスト用ユーザー情報
const TEST_USER = {
  email: "test-search-todos@example.com",
  password: "TestPassword123!",
};

/**
 * search-todos のレスポンス型
 * sel_todos_search の戻り値（database.types.ts が最新ではないためテストでローカル定義）
 */
type SearchedTodo = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  // 新しい sel_todos_search では返るが、旧シグネチャでは無い場合があるためオプショナル
  relevance_score?: number;
};

/**
 * 検索エンドポイントへ GET リクエストを送る
 */
async function searchTodos(
  accessToken: string,
  params: { q?: string; limit?: number | string; offset?: number | string },
): Promise<Response> {
  const url = new URL(buildEndpointUrl(FUNCTION_NAME));
  if (params.q !== undefined) url.searchParams.set("q", params.q);
  if (params.limit !== undefined) {
    url.searchParams.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.set("offset", String(params.offset));
  }
  return await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * テストユーザーの ToDo を任意の内容でまとめて作成
 */
async function insertTodos(
  mUserId: string,
  supabase: SupabaseClient,
  todos: Array<{
    title: string;
    description?: string | null;
    status?: "pending" | "in_progress" | "completed" | "cancelled";
    priority?: "low" | "medium" | "high";
  }>,
): Promise<void> {
  const rows = todos.map((t) => ({
    user_id: mUserId,
    title: t.title,
    description: t.description ?? null,
    status: t.status ?? "pending",
    priority: t.priority ?? "medium",
    created_program: FUNCTION_NAME,
    updated_program: FUNCTION_NAME,
  }));
  const { error } = await supabase.from("t_todo").insert(rows);
  if (error) {
    throw new Error(`ToDoデータの挿入に失敗しました: ${error.message}`);
  }
}

/**
 * テストユーザーの ToDo を削除
 */
async function cleanupTestTodos(
  mUserId: string,
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.from("t_todo").delete().eq("user_id", mUserId);
}

// ============================================================
// HTTP メソッド検証
// ============================================================

Deno.test("search-todos - POST で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("POST で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "POST");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("POST で呼ぶと 405 Method not allowed が返る");
});

Deno.test("search-todos - PUT で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("PUT で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "PUT");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("PUT で呼ぶと 405 Method not allowed が返る");
});

Deno.test("search-todos - DELETE で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("DELETE で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "DELETE");
  await assertErrorResponse(response, 405, "Method not allowed");
  logTestEnd("DELETE で呼ぶと 405 Method not allowed が返る");
});

// ============================================================
// 認証検証
// ============================================================

Deno.test({
  name: "search-todos - 認証ヘッダーなしで GET すると 401 が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("認証ヘッダーなしで GET すると 401 が返る");
    const url = new URL(buildEndpointUrl(FUNCTION_NAME));
    url.searchParams.set("q", "テスト");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    await logNon200Response(response.clone());

    assertEquals(response.status, 401);
    const data = await response.json();
    assert(
      data.success === false || data.msg !== undefined,
      "エラーレスポンスが存在するべき",
    );
    logTestEnd("認証ヘッダーなしで GET すると 401 が返る");
  },
});

Deno.test({
  name: "search-todos - 無効なトークンで GET すると 401 が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("無効なトークンで GET すると 401 が返る");
    const url = new URL(buildEndpointUrl(FUNCTION_NAME));
    url.searchParams.set("q", "テスト");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
    });

    await logNon200Response(response.clone());

    assertEquals(response.status, 401);
    const data = await response.json();
    assert(
      data.success === false || data.msg !== undefined,
      "エラーレスポンスが存在するべき",
    );
    logTestEnd("無効なトークンで GET すると 401 が返る");
  },
});

// ============================================================
// バリデーション
// ============================================================

Deno.test({
  name:
    "search-todos - q パラメータなしで検索すると 400 VALIDATION_ERROR が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("q パラメータなしで検索すると 400 VALIDATION_ERROR が返る");
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      // q を付与しない（schema 側で空文字となり min(1) に違反する）
      const response = await searchTodos(accessToken, {});
      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
      assertEquals(data.error.message, "キーワードを入力してください");
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("q パラメータなしで検索すると 400 VALIDATION_ERROR が返る");
  },
});

Deno.test({
  name:
    "search-todos - q が空白のみで検索すると trim 後に空文字となり 400 が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("q が空白のみで検索すると trim 後に空文字となり 400 が返る");
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      const response = await searchTodos(accessToken, { q: "   " });
      await logNon200Response(response.clone());

      // trim 後に空文字となり min(1) に違反する
      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
      assertEquals(data.error.message, "キーワードを入力してください");
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("q が空白のみで検索すると trim 後に空文字となり 400 が返る");
  },
});

Deno.test({
  name:
    "search-todos - q が 201 文字で検索すると 400 VALIDATION_ERROR が返る（境界外）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "q が 201 文字で検索すると 400 VALIDATION_ERROR が返る（境界外）",
    );
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      const tooLongQ = "a".repeat(201);
      const response = await searchTodos(accessToken, { q: tooLongQ });
      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "q が 201 文字で検索すると 400 VALIDATION_ERROR が返る（境界外）",
    );
  },
});

Deno.test({
  name:
    "search-todos - キーワード 11 個で検索すると 400 VALIDATION_ERROR が返る（上限 10 超過）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "キーワード 11 個で検索すると 400 VALIDATION_ERROR が返る（上限 10 超過）",
    );
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      // 11 個のキーワード (MAX_KEYWORD_COUNT = 10)
      const q = Array.from({ length: 11 }, (_, i) => `kw${i}`).join(" ");
      const response = await searchTodos(accessToken, { q });
      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
      assertEquals(data.error.message, "キーワードは最大10個までです");
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "キーワード 11 個で検索すると 400 VALIDATION_ERROR が返る（上限 10 超過）",
    );
  },
});

Deno.test({
  name:
    "search-todos - キーワード 1 つが 101 文字で検索すると 400 VALIDATION_ERROR が返る（上限 100 超過）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "キーワード 1 つが 101 文字で検索すると 400 VALIDATION_ERROR が返る（上限 100 超過）",
    );
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      // 101 文字のキーワード (MAX_KEYWORD_LENGTH = 100)
      // q 全体は max(200) 以内に収めるためフレーズではなく単一トークンで送る
      const q = "a".repeat(101);
      const response = await searchTodos(accessToken, { q });
      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
      assertEquals(
        data.error.message,
        "各キーワードは100文字以内にしてください",
      );
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "キーワード 1 つが 101 文字で検索すると 400 VALIDATION_ERROR が返る（上限 100 超過）",
    );
  },
});

Deno.test({
  name:
    "search-todos - limit=51 で検索すると 400 VALIDATION_ERROR が返る（上限 50 超過）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "limit=51 で検索すると 400 VALIDATION_ERROR が返る（上限 50 超過）",
    );
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      const response = await searchTodos(accessToken, {
        q: "テスト",
        limit: 51,
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
      "limit=51 で検索すると 400 VALIDATION_ERROR が返る（上限 50 超過）",
    );
  },
});

Deno.test({
  name:
    "search-todos - offset=-1 で検索すると 400 VALIDATION_ERROR が返る（負数）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("offset=-1 で検索すると 400 VALIDATION_ERROR が返る（負数）");
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      const response = await searchTodos(accessToken, {
        q: "テスト",
        offset: -1,
      });
      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("offset=-1 で検索すると 400 VALIDATION_ERROR が返る（負数）");
  },
});

// ============================================================
// 正常系
// ============================================================

Deno.test({
  name: "search-todos - キーワードに一致する ToDo を検索すると該当 1 件が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("キーワードに一致する ToDo を検索すると該当 1 件が返る");
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      await insertTodos(mUserId, supabase, [
        { title: "買い物リスト", description: "牛乳とパンを買う" },
        { title: "勉強する", description: "TypeScript の本を読む" },
        { title: "運動する", description: "ジムに行く" },
      ]);

      const response = await searchTodos(accessToken, { q: "買い物" });
      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const result = await response.json();
      // 観点 #9（契約）: レスポンス DTO の必須項目を検証
      assertSuccessShape(result, [
        "id",
        "title",
        "description",
        "status",
        "priority",
      ]);

      const data = result.data as SearchedTodo[];
      assertEquals(data.length, 1, "1件のToDoが返るべき");

      const todo = data[0];
      assert(UUID_V7_REGEX.test(todo.id), `id は UUID v7 形式: ${todo.id}`);
      assertEquals(todo.title, "買い物リスト");
      assertEquals(todo.description, "牛乳とパンを買う");
      assertEquals(todo.status, "pending");
      assertEquals(todo.priority, "medium");
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("キーワードに一致する ToDo を検索すると該当 1 件が返る");
  },
});

Deno.test({
  name: "search-todos - 一致しないキーワードで検索すると空配列が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("一致しないキーワードで検索すると空配列が返る");
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      await insertTodos(mUserId, supabase, [
        { title: "買い物リスト", description: "牛乳とパンを買う" },
      ]);

      const response = await searchTodos(accessToken, {
        q: "存在しないキーワードxyz12345",
      });
      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const result = await response.json();
      assertEquals(result.success, true);

      const data = result.data as SearchedTodo[];
      assert(Array.isArray(data), "data は配列であるべき");
      assertEquals(data.length, 0, "0件のToDoが返るべき");
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("一致しないキーワードで検索すると空配列が返る");
  },
});

Deno.test({
  name:
    "search-todos - 複数キーワードで検索すると両方を含む 1 件のみが返る（AND 検索）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "複数キーワードで検索すると両方を含む 1 件のみが返る（AND 検索）",
    );
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      await insertTodos(mUserId, supabase, [
        { title: "東京で買い物", description: "渋谷へ行く" },
        { title: "札幌で買い物", description: "大通公園" },
        { title: "東京で観光", description: "浅草寺に行く" },
      ]);

      // "東京" AND "買い物" の両方が含まれる ToDo だけがヒットするはず
      const response = await searchTodos(accessToken, { q: "東京 買い物" });
      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const result = await response.json();
      const data = result.data as SearchedTodo[];

      assertEquals(data.length, 1, "AND 検索で 1 件のみ返るべき");
      assertEquals(data[0].title, "東京で買い物");
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "複数キーワードで検索すると両方を含む 1 件のみが返る（AND 検索）",
    );
  },
});

Deno.test({
  name:
    "search-todos - 5 件マッチ時に limit=2 で 3 ページ繰ると重複なく全件取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "5 件マッチ時に limit=2 で 3 ページ繰ると重複なく全件取得できる",
    );
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      // 同じキーワードを含む 5 件
      const todos = Array.from({ length: 5 }, (_, i) => ({
        title: `共通ワード ToDo ${i + 1}`,
        description: `説明 ${i + 1}`,
      }));
      await insertTodos(mUserId, supabase, todos);

      // 1 ページ目: limit=2
      const page1 = await searchTodos(accessToken, {
        q: "共通ワード",
        limit: 2,
        offset: 0,
      });
      await logNon200Response(page1.clone());
      assertEquals(page1.status, 200);
      const data1 = (await page1.json()).data as SearchedTodo[];
      assertEquals(data1.length, 2, "1 ページ目は 2 件");

      // 2 ページ目: limit=2 offset=2
      const page2 = await searchTodos(accessToken, {
        q: "共通ワード",
        limit: 2,
        offset: 2,
      });
      await logNon200Response(page2.clone());
      assertEquals(page2.status, 200);
      const data2 = (await page2.json()).data as SearchedTodo[];
      assertEquals(data2.length, 2, "2 ページ目は 2 件");

      // 3 ページ目: limit=2 offset=4 → 残り 1 件
      const page3 = await searchTodos(accessToken, {
        q: "共通ワード",
        limit: 2,
        offset: 4,
      });
      await logNon200Response(page3.clone());
      assertEquals(page3.status, 200);
      const data3 = (await page3.json()).data as SearchedTodo[];
      assertEquals(data3.length, 1, "3 ページ目は 1 件");

      // ページ間で id が重複していないこと
      const allIds = [...data1, ...data2, ...data3].map((t) => t.id);
      const uniqueIds = new Set(allIds);
      assertEquals(uniqueIds.size, 5, "ページング結果に重複が無いこと");
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "5 件マッチ時に limit=2 で 3 ページ繰ると重複なく全件取得できる",
    );
  },
});

Deno.test({
  name:
    'search-todos - "Next js" でフレーズ検索すると "Next js 学習" のみがヒットする',
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      '"Next js" でフレーズ検索すると "Next js 学習" のみがヒットする',
    );
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      await insertTodos(mUserId, supabase, [
        { title: "Next js 学習", description: "App Router を試す" },
        { title: "Next 入門", description: "公式ドキュメントを読む" },
        { title: "js の基礎", description: "ES2024 の新機能" },
      ]);

      // "Next js" フレーズで検索 → "Next js 学習" のみ部分一致
      const response = await searchTodos(accessToken, { q: '"Next js"' });
      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const data = (await response.json()).data as SearchedTodo[];
      assert(Array.isArray(data));
      assert(
        data.some((t) => t.title === "Next js 学習"),
        "フレーズ一致の ToDo が含まれるべき",
      );
      assert(
        !data.some((t) => t.title === "Next 入門"),
        "フレーズに一致しない ToDo は含まれないべき",
      );
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      '"Next js" でフレーズ検索すると "Next js 学習" のみがヒットする',
    );
  },
});

Deno.test({
  name: "search-todos - 論理削除された ToDo は検索結果に含まれない",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("論理削除された ToDo は検索結果に含まれない");
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      await insertTodos(mUserId, supabase, [
        { title: "削除済みタスク", description: "これは削除済み" },
        { title: "残るタスク", description: "削除済み というキーワード" },
      ]);

      // 1 件目を論理削除
      const { error: updateError } = await supabase
        .from("t_todo")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", mUserId)
        .eq("title", "削除済みタスク");
      assert(!updateError, "論理削除に成功するべき");

      const response = await searchTodos(accessToken, { q: "削除済み" });
      await logNon200Response(response.clone());

      assertEquals(response.status, 200);
      const data = (await response.json()).data as SearchedTodo[];

      // 論理削除されたものは含まれないこと
      assert(
        !data.some((t) => t.title === "削除済みタスク"),
        "論理削除された ToDo は返ってはいけない",
      );
      // 「残るタスク」（description にキーワード）はヒットするべき
      assert(
        data.some((t) => t.title === "残るタスク"),
        "未削除の ToDo はヒットするべき",
      );
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("論理削除された ToDo は検索結果に含まれない");
  },
});

// ============================================================
// ユーザー分離
// ============================================================

Deno.test({
  name:
    "search-todos - 別ユーザーで検索すると自分の ToDo のみがヒットする（テナント境界）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "別ユーザーで検索すると自分の ToDo のみがヒットする（テナント境界）",
    );

    const testUser1 = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    const testUser2 = await createTestUser(
      "test-search-todos-2@example.com",
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      await insertTodos(testUser1.mUserId, testUser1.supabase, [
        { title: "ユーザー1の共通キーワード A" },
        { title: "ユーザー1の共通キーワード B" },
      ]);
      await insertTodos(testUser2.mUserId, testUser2.supabase, [
        { title: "ユーザー2の共通キーワード X" },
        { title: "ユーザー2の共通キーワード Y" },
        { title: "ユーザー2の共通キーワード Z" },
      ]);

      // ユーザー1で検索 → 自分の 2 件だけ
      const response1 = await searchTodos(testUser1.accessToken, {
        q: "共通キーワード",
      });
      await logNon200Response(response1.clone());
      assertEquals(response1.status, 200);
      const data1 = (await response1.json()).data as SearchedTodo[];
      assertEquals(data1.length, 2, "ユーザー1は自分の 2 件のみ取得できる");
      assert(
        data1.every((t) => t.title.startsWith("ユーザー1")),
        "ユーザー1の結果は全て自分の ToDo",
      );

      // ユーザー2で検索 → 自分の 3 件だけ
      const response2 = await searchTodos(testUser2.accessToken, {
        q: "共通キーワード",
      });
      await logNon200Response(response2.clone());
      assertEquals(response2.status, 200);
      const data2 = (await response2.json()).data as SearchedTodo[];
      assertEquals(data2.length, 3, "ユーザー2は自分の 3 件のみ取得できる");
      assert(
        data2.every((t) => t.title.startsWith("ユーザー2")),
        "ユーザー2の結果は全て自分の ToDo",
      );
    } finally {
      await cleanupTestTodos(testUser1.mUserId, testUser1.supabase);
      await cleanupTestTodos(testUser2.mUserId, testUser2.supabase);
      await cleanupTestUser(testUser1.authUserId, testUser1.supabase);
      await cleanupTestUser(testUser2.authUserId, testUser2.supabase);
    }
    logTestEnd(
      "別ユーザーで検索すると自分の ToDo のみがヒットする（テナント境界）",
    );
  },
});

// ============================================================
// パフォーマンス
// ============================================================

Deno.test({
  name: "search-todos - 50 件マッチする状態で検索しても 3 秒以内に応答が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("50 件マッチする状態で検索しても 3 秒以内に応答が返る");
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );
    try {
      const todos = Array.from({ length: 50 }, (_, i) => ({
        title: `パフォーマンステスト ToDo ${i + 1}`,
        description: `説明 ${i + 1}`,
      }));
      await insertTodos(mUserId, supabase, todos);

      const startTime = Date.now();
      const response = await searchTodos(accessToken, {
        q: "パフォーマンステスト",
        limit: 50,
      });
      const elapsed = Date.now() - startTime;

      await logNon200Response(response.clone());

      assertResponseTime(elapsed, 3000);
      assertEquals(response.status, 200);
      const data = (await response.json()).data as SearchedTodo[];
      assert(data.length > 0, "検索結果が 1 件以上返るべき");
    } finally {
      await cleanupTestTodos(mUserId, supabase);
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("50 件マッチする状態で検索しても 3 秒以内に応答が返る");
  },
});
