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

// テスト対象の関数名
const FUNCTION_NAME = "create-user";

// テスト用ユーザー情報
const TEST_USER = {
  email: "test-create-user@example.com",
  password: "TestPassword123!",
};

// レスポンス型（Edge Function の success 時の data）
interface CreateUserResponseData {
  id: string;
  email: string;
  role: string;
}

/**
 * 認証ユーザーは残したまま m_user 側だけ削除する
 * （create-user の新規作成パス／404 経路を再現するために使用）
 */
async function deleteMUserOnly(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("m_user")
    .delete()
    .eq("supabase_auth_user_id", authUserId);
  if (error) {
    throw new Error(`m_user の削除に失敗しました: ${error.message}`);
  }
}

Deno.test("create-user - GET で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("GET で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "GET");
  await assertErrorResponse(response, 405);
  logTestEnd("GET で呼ぶと 405 Method not allowed が返る");
});

Deno.test("create-user - PUT で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("PUT で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "PUT");
  await assertErrorResponse(response, 405);
  logTestEnd("PUT で呼ぶと 405 Method not allowed が返る");
});

Deno.test("create-user - DELETE で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("DELETE で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "DELETE");
  await assertErrorResponse(response, 405);
  logTestEnd("DELETE で呼ぶと 405 Method not allowed が返る");
});

Deno.test({
  name: "create-user - 認証ヘッダーなしで POST すると 401 が返る",
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
      body: JSON.stringify({ email: TEST_USER.email }),
    });

    await logNon200Response(response.clone());

    assertEquals(response.status, 401);

    const data = await response.json();
    assert(
      data.success === false || data.msg !== undefined,
      "エラーレスポンスが存在するべき",
    );
    logTestEnd("認証ヘッダーなしで POST すると 401 が返る");
  },
});

Deno.test({
  name: "create-user - 無効なトークンで POST すると 401 が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("無効なトークンで POST すると 401 が返る");
    const endpointUrl = buildEndpointUrl(FUNCTION_NAME);

    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({ email: TEST_USER.email }),
    });

    await logNon200Response(response.clone());

    assertEquals(response.status, 401);

    const data = await response.json();
    assert(
      data.success === false || data.msg !== undefined,
      "エラーレスポンスが存在するべき",
    );
    logTestEnd("無効なトークンで POST すると 401 が返る");
  },
});

Deno.test({
  name:
    "create-user - 不正な JSON ボディで POST すると 400 VALIDATION_ERROR が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "不正な JSON ボディで POST すると 400 VALIDATION_ERROR が返る",
    );

    const { authUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const response = await makeRawRequest(
        FUNCTION_NAME,
        "POST",
        "{invalid-json",
        { Authorization: `Bearer ${accessToken}` },
      );

      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("不正な JSON ボディで POST すると 400 VALIDATION_ERROR が返る");
  },
});

Deno.test({
  name:
    "create-user - email フィールドなしで POST すると 400 VALIDATION_ERROR が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "email フィールドなしで POST すると 400 VALIDATION_ERROR が返る",
    );

    const { authUserId, accessToken, supabase } = await createTestUser(
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
        body: JSON.stringify({}),
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, { code: "VALIDATION_ERROR" });
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "email フィールドなしで POST すると 400 VALIDATION_ERROR が返る",
    );
  },
});

Deno.test({
  name:
    "create-user - 不正な email 形式で POST すると 400 VALIDATION_ERROR が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("不正な email 形式で POST すると 400 VALIDATION_ERROR が返る");

    const { authUserId, accessToken, supabase } = await createTestUser(
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
        body: JSON.stringify({ email: "not-an-email" }),
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 400);
      const data = await response.json();
      assertErrorShape(data, {
        code: "VALIDATION_ERROR",
        messageIncludes: "有効なメールアドレス",
      });
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("不正な email 形式で POST すると 400 VALIDATION_ERROR が返る");
  },
});

Deno.test({
  name:
    "create-user - 既存 m_user がある状態で再 POST すると 200 で既存レコードが返る（冪等）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "既存 m_user がある状態で再 POST すると 200 で既存レコードが返る（冪等）",
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
        body: JSON.stringify({ email: TEST_USER.email }),
      });

      await logNon200Response(response.clone());

      // 既存レコードがある場合は 200 OK で既存値をそのまま返す
      assertEquals(response.status, 200);

      const result = await response.json();
      // 観点 #9（契約）: レスポンス DTO の必須項目を検証
      assertSuccessShape(result, ["id", "email", "role"]);

      const data = result.data as CreateUserResponseData;
      assertEquals(
        String(data.id),
        mUserId,
        "既存 m_user.id がそのまま返されるべき",
      );
      assertEquals(data.email, TEST_USER.email);
      assertEquals(data.role, "user");

      // DB のレコード数が増えていないことを確認（冪等性）
      const { count, error: countError } = await supabase
        .from("m_user")
        .select("id", { count: "exact", head: true })
        .eq("supabase_auth_user_id", authUserId)
        .is("deleted_at", null);
      assert(!countError, "m_user の件数取得に成功するべき");
      assertEquals(count, 1, "m_user のレコードは 1 件のままであるべき");
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "既存 m_user がある状態で再 POST すると 200 で既存レコードが返る（冪等）",
    );
  },
});

Deno.test({
  name:
    "create-user - m_user が未作成の状態で POST すると 201 で新規作成される",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("m_user が未作成の状態で POST すると 201 で新規作成される");

    const { authUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // createTestUser が事前に作成した m_user を削除し、新規作成パスを再現
      await deleteMUserOnly(supabase, authUserId);

      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: TEST_USER.email }),
      });

      await logNon200Response(response.clone());

      // 新規作成は 201
      assertEquals(response.status, 201);

      const result = await response.json();
      // 観点 #9（契約）: レスポンス DTO の必須項目を検証
      assertSuccessShape(result, ["id", "email", "role"]);

      const data = result.data as CreateUserResponseData;
      assertEquals(data.email, TEST_USER.email);
      assertEquals(data.role, "user");

      // DB に実際に作成されていることを確認
      const { data: row, error: selectError } = await supabase
        .from("m_user")
        .select("id, email, role, supabase_auth_user_id")
        .eq("supabase_auth_user_id", authUserId)
        .is("deleted_at", null)
        .single();

      assert(!selectError, "m_user の取得に成功するべき");
      assertExists(row, "m_user レコードが作成されているべき");
      assertEquals(row?.email, TEST_USER.email);
      assertEquals(row?.role, "user");
      assertEquals(row?.supabase_auth_user_id, authUserId);
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("m_user が未作成の状態で POST すると 201 で新規作成される");
  },
});

Deno.test({
  name:
    "create-user - 同一ユーザーで連続実行すると 2 回目以降は同じ m_user.id が返る（冪等）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "同一ユーザーで連続実行すると 2 回目以降は同じ m_user.id が返る（冪等）",
    );

    const { authUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // 既存 m_user を削除してから連続呼び出しを行う
      await deleteMUserOnly(supabase, authUserId);

      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };
      const body = JSON.stringify({ email: TEST_USER.email });

      // 1回目: 新規作成
      const response1 = await fetch(endpointUrl, {
        method: "POST",
        headers,
        body,
      });
      await logNon200Response(response1.clone());
      assertEquals(response1.status, 201);
      const data1 = (await response1.json()).data as CreateUserResponseData;

      // 2回目: 既存値を返す
      const response2 = await fetch(endpointUrl, {
        method: "POST",
        headers,
        body,
      });
      await logNon200Response(response2.clone());
      assertEquals(response2.status, 200);
      const data2 = (await response2.json()).data as CreateUserResponseData;

      assertEquals(
        String(data2.id),
        String(data1.id),
        "2回目以降は同じ m_user.id が返るべき",
      );
      assertEquals(data2.email, data1.email);
      assertEquals(data2.role, data1.role);

      // DB レコードも 1 件のままであることを確認
      const { count, error: countError } = await supabase
        .from("m_user")
        .select("id", { count: "exact", head: true })
        .eq("supabase_auth_user_id", authUserId)
        .is("deleted_at", null);
      assert(!countError, "m_user の件数取得に成功するべき");
      assertEquals(count, 1, "m_user のレコードは 1 件のままであるべき");
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "同一ユーザーで連続実行すると 2 回目以降は同じ m_user.id が返る（冪等）",
    );
  },
});

Deno.test({
  name:
    "create-user - auth.users と異なる email をボディで指定して POST するとボディの email が m_user に保存される",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "auth.users と異なる email をボディで指定して POST するとボディの email が m_user に保存される",
    );

    const { authUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // 新規作成パスを再現
      await deleteMUserOnly(supabase, authUserId);

      // auth.users の email と異なるアドレスをボディで指定
      const otherEmail = "test-create-user-alt@example.com";

      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: otherEmail }),
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 201);
      const result = await response.json();
      assertEquals(result.success, true);

      const data = result.data as CreateUserResponseData;
      assertEquals(
        data.email,
        otherEmail,
        "リクエストボディの email が m_user に保存されるべき",
      );
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "auth.users と異なる email をボディで指定して POST するとボディの email が m_user に保存される",
    );
  },
});

Deno.test({
  name: "create-user - 既存 m_user に対する冪等パスでも 3 秒以内に応答が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("既存 m_user に対する冪等パスでも 3 秒以内に応答が返る");

    const { authUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const startTime = Date.now();
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: TEST_USER.email }),
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      await logNon200Response(response.clone());

      assertResponseTime(responseTime, 3000);
      assertEquals(response.status, 200);

      const result = await response.json();
      assertEquals(result.success, true);
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("既存 m_user に対する冪等パスでも 3 秒以内に応答が返る");
  },
});
