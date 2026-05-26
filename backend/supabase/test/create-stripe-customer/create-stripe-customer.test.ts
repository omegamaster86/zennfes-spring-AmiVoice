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
import { assert, assertEquals, assertExists } from "@std/assert";
// Supabaseクライアントのインポート
import type { SupabaseClient } from "@supabase/client";

// テスト対象の関数名
const FUNCTION_NAME = "create-stripe-customer";

// テスト用ユーザー情報
const TEST_USER = {
  email: "test-create-stripe-customer@example.com",
  password: "TestPassword123!",
};

// レスポンス型（Edge Function の success 時の data）
interface CreateStripeCustomerResponseData {
  id: string;
  email: string;
  stripeCustomerId: string;
}

// STRIPE_SECRET_KEY が設定されている場合のみ実 Stripe API を叩くテストを実行する
const HAS_STRIPE_KEY = !!Deno.env.get("STRIPE_SECRET_KEY");

/**
 * 指定 m_user の stripe_customer_id を直接更新（service_role 経由で RLS をバイパス）
 */
async function setStripeCustomerId(
  supabase: SupabaseClient,
  mUserId: string,
  stripeCustomerId: string | null,
): Promise<void> {
  // database.types.ts に stripe_customer_id 列が未反映のため any 経由で更新する
  // （本番 DB / migration には存在することを Edge Function 実装が前提としている）
  const { error } = await (
    supabase.from("m_user") as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => Promise<{ error: unknown }>;
      };
    }
  )
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", mUserId);
  if (error) {
    throw new Error(
      `m_user.stripe_customer_id の更新に失敗しました: ${
        (error as { message?: string }).message ?? String(error)
      }`,
    );
  }
}

Deno.test("create-stripe-customer - GET で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("GET で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "GET");
  await assertErrorResponse(response, 405);
  logTestEnd("GET で呼ぶと 405 Method not allowed が返る");
});

Deno.test("create-stripe-customer - PUT で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("PUT で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "PUT");
  await assertErrorResponse(response, 405);
  logTestEnd("PUT で呼ぶと 405 Method not allowed が返る");
});

Deno.test("create-stripe-customer - DELETE で呼ぶと 405 Method not allowed が返る", async () => {
  logTestStart("DELETE で呼ぶと 405 Method not allowed が返る");
  const response = await makeRequest(FUNCTION_NAME, "DELETE");
  await assertErrorResponse(response, 405);
  logTestEnd("DELETE で呼ぶと 405 Method not allowed が返る");
});

Deno.test({
  name: "create-stripe-customer - 認証ヘッダーなしで POST すると 401 が返る",
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
  name: "create-stripe-customer - 無効なトークンで POST すると 401 が返る",
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
    "create-stripe-customer - m_user 未作成のユーザーで呼ぶと 404 USER_NOT_FOUND が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("m_user 未作成のユーザーで呼ぶと 404 USER_NOT_FOUND が返る");

    // テストユーザー作成
    const { authUserId, supabase, accessToken } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // 認証ユーザーは残したまま m_user 側だけ削除し、404 経路を再現
      const { error: delError } = await supabase
        .from("m_user")
        .delete()
        .eq("supabase_auth_user_id", authUserId);
      assert(!delError, "m_user の事前削除に成功するべき");

      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      assertEquals(response.status, 404);
      const data = await response.json();
      assertErrorShape(data, { code: "USER_NOT_FOUND" });
    } finally {
      // m_user は既に削除済みでも cleanupTestUser は冪等
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd("m_user 未作成のユーザーで呼ぶと 404 USER_NOT_FOUND が返る");
  },
});

Deno.test({
  name:
    "create-stripe-customer - 有効な stripe_customer_id を持つユーザーが再実行すると 200 で既存値が返る（冪等）",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "有効な stripe_customer_id を持つユーザーが再実行すると 200 で既存値が返る（冪等）",
    );

    // テストユーザー作成
    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    // 事前に stripe_customer_id を設定
    const existingCustomerId = "cus_test_existing_idempotent";
    try {
      await setStripeCustomerId(supabase, mUserId, existingCustomerId);

      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      // 既存IDがある場合は 200 OK で既存値をそのまま返す（Stripe API は呼ばれない）
      assertEquals(response.status, 200);

      const result = await response.json();
      // 観点 #9（契約）: レスポンス DTO の必須項目を検証
      assertSuccessShape(result, ["id", "email", "stripeCustomerId"]);

      const data = result.data as CreateStripeCustomerResponseData;
      assertEquals(
        data.stripeCustomerId,
        existingCustomerId,
        "既存の stripe_customer_id がそのまま返されるべき",
      );
      assertEquals(data.email, TEST_USER.email);
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "有効な stripe_customer_id を持つユーザーが再実行すると 200 で既存値が返る（冪等）",
    );
  },
});

Deno.test({
  name:
    "create-stripe-customer - cus_ で始まらない stripe_customer_id を持つユーザーが実行すると 201 で新規作成される",
  sanitizeResources: false,
  sanitizeOps: false,
  ignore: !HAS_STRIPE_KEY,
  async fn() {
    logTestStart(
      "cus_ で始まらない stripe_customer_id を持つユーザーが実行すると 201 で新規作成される",
    );

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // isStripeId(prefix: "cus_") を満たさない値をセット → 新規作成パスへ流れる
      await setStripeCustomerId(supabase, mUserId, "invalid_prefix_xyz");

      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      // 新規作成された場合は 201
      assertEquals(response.status, 201);
      const result = await response.json();
      assertEquals(result.success, true);

      const data = result.data as CreateStripeCustomerResponseData;
      assertExists(data.stripeCustomerId);
      assert(
        data.stripeCustomerId.startsWith("cus_"),
        `stripeCustomerId は cus_ で始まるべき: ${data.stripeCustomerId}`,
      );
      assert(
        data.stripeCustomerId !== "invalid_prefix_xyz",
        "新規作成され、不正な値ではなくなっているべき",
      );
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "cus_ で始まらない stripe_customer_id を持つユーザーが実行すると 201 で新規作成される",
    );
  },
});

Deno.test({
  name:
    "create-stripe-customer - stripe_customer_id 未設定のユーザーが呼ぶと 201 で新規作成される",
  sanitizeResources: false,
  sanitizeOps: false,
  ignore: !HAS_STRIPE_KEY,
  async fn() {
    logTestStart(
      "stripe_customer_id 未設定のユーザーが呼ぶと 201 で新規作成される",
    );

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // stripe_customer_id は null のまま（createTestUser のデフォルト）
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      // 新規作成は 201
      assertEquals(response.status, 201);

      const result = await response.json();
      // 観点 #9（契約）: レスポンス DTO の必須項目を検証
      assertSuccessShape(result, ["id", "email", "stripeCustomerId"]);

      const data = result.data as CreateStripeCustomerResponseData;
      assertEquals(data.email, TEST_USER.email);
      assert(
        data.stripeCustomerId.startsWith("cus_"),
        `stripeCustomerId は cus_ で始まるべき: ${data.stripeCustomerId}`,
      );

      // DB にも保存されていること（service_role で確認）
      const { data: row, error: selErr } = await (
        supabase.from("m_user").select("stripe_customer_id") as unknown as {
          eq: (
            col: string,
            val: unknown,
          ) => {
            single: () => Promise<{
              data: { stripe_customer_id: string | null } | null;
              error: unknown;
            }>;
          };
        }
      )
        .eq("id", mUserId)
        .single();

      assert(!selErr, "m_user の取得に成功するべき");
      assertEquals(
        row?.stripe_customer_id,
        data.stripeCustomerId,
        "DB の stripe_customer_id が更新されているべき",
      );
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "stripe_customer_id 未設定のユーザーが呼ぶと 201 で新規作成される",
    );
  },
});

Deno.test({
  name:
    "create-stripe-customer - 同一ユーザーで連続実行すると 2 回目以降は同じ stripe_customer_id が返る（冪等）",
  sanitizeResources: false,
  sanitizeOps: false,
  ignore: !HAS_STRIPE_KEY,
  async fn() {
    logTestStart(
      "同一ユーザーで連続実行すると 2 回目以降は同じ stripe_customer_id が返る（冪等）",
    );

    const { authUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      // 1回目: 新規作成
      const response1 = await fetch(endpointUrl, { method: "POST", headers });
      await logNon200Response(response1.clone());
      assertEquals(response1.status, 201);
      const data1 = (await response1.json())
        .data as CreateStripeCustomerResponseData;

      // 2回目: 既存値を返す
      const response2 = await fetch(endpointUrl, { method: "POST", headers });
      await logNon200Response(response2.clone());
      assertEquals(response2.status, 200);
      const data2 = (await response2.json())
        .data as CreateStripeCustomerResponseData;

      assertEquals(
        data2.stripeCustomerId,
        data1.stripeCustomerId,
        "2回目以降は同じ stripe_customer_id が返るべき",
      );
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "同一ユーザーで連続実行すると 2 回目以降は同じ stripe_customer_id が返る（冪等）",
    );
  },
});

Deno.test({
  name:
    "create-stripe-customer - 既存値のある冪等パスでも 3 秒以内に応答が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart("既存値のある冪等パスでも 3 秒以内に応答が返る");

    const { authUserId, mUserId, accessToken, supabase } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // 既存IDをセットして Stripe API を経由しない冪等パスで計測
      await setStripeCustomerId(supabase, mUserId, "cus_test_perf_check");

      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const startTime = Date.now();
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
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
    logTestEnd("既存値のある冪等パスでも 3 秒以内に応答が返る");
  },
});

// ============================================================
// 観点 #3 / #8: m_user の論理削除済みケース
// ============================================================

Deno.test({
  name:
    "create-stripe-customer - m_user が論理削除済みのユーザーで呼ぶと 404 USER_NOT_FOUND が返る",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    logTestStart(
      "m_user が論理削除済みのユーザーで呼ぶと 404 USER_NOT_FOUND が返る",
    );

    const { authUserId, mUserId, supabase, accessToken } = await createTestUser(
      TEST_USER.email,
      TEST_USER.password,
      FUNCTION_NAME,
    );

    try {
      // m_user.deleted_at をセット（論理削除）
      const { error: updError } = await supabase
        .from("m_user")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", mUserId);
      assert(!updError, "m_user の論理削除に成功するべき");

      const endpointUrl = buildEndpointUrl(FUNCTION_NAME);
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await logNon200Response(response.clone());

      // 実装は `.is("deleted_at", null)` で絞り込むため、論理削除済みは 404 扱い
      assertEquals(response.status, 404);
      const data = await response.json();
      assertErrorShape(data, { code: "USER_NOT_FOUND" });
    } finally {
      await cleanupTestUser(authUserId, supabase);
    }
    logTestEnd(
      "m_user が論理削除済みのユーザーで呼ぶと 404 USER_NOT_FOUND が返る",
    );
  },
});
