/**
 * E2Eテスト用ユーザー管理ヘルパー（Playwright/Node.js専用）
 *
 * テストユーザーの作成・削除を行うユーティリティ
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * E2Eテストユーザー情報の型定義
 */
export interface E2ETestUser {
  authUserId: string; // auth.users.id
  mUserId: number; // m_user.id
  email: string;
  password: string;
  supabase: SupabaseClient;
}

/**
 * E2Eテスト用のユーザーを作成
 *
 * @param email - ユーザーのメールアドレス
 * @param password - ユーザーのパスワード
 * @param role - ユーザーロール（デフォルト: "user"）
 * @returns テストユーザー情報
 *
 * @example
 * ```typescript
 * const user = await createE2ETestUser("test@example.com", "password123");
 * // テスト実行...
 * await cleanupE2ETestUser(user);
 * ```
 */
export async function createE2ETestUser(
  email: string,
  password: string,
  role: "admin" | "user" | "guest" = "user",
): Promise<E2ETestUser> {
  // Supabase接続情報を環境変数から取得
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY環境変数が設定されていません",
    );
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません");
  }

  // 管理者権限のSupabaseクライアント（Service Role Key）
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Publishable keyのSupabaseクライアント（サインアップ用）
  const publishableClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 既存ユーザーがいる場合は削除
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === email);
  if (existingUser) {
    // m_userテーブルのレコードを先に削除
    await adminClient
      .from("m_user")
      .delete()
      .eq("supabase_auth_user_id", existingUser.id);
    // auth.usersのユーザーを削除
    await adminClient.auth.admin.deleteUser(existingUser.id);
  }

  // 新規ユーザー作成（auth.users）
  const { data: signUpData, error: signUpError } =
    await publishableClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // メール確認をスキップ
      },
    });

  if (signUpError || !signUpData.user) {
    throw new Error(`ユーザー作成に失敗しました: ${signUpError?.message}`);
  }

  // ユーザーのメールを確認済みにする（テスト用）
  await adminClient.auth.admin.updateUserById(signUpData.user.id, {
    email_confirm: true,
  });

  // m_userテーブルにレコードを作成（service_roleを使用してRLSをバイパス）
  const { data: mUserData, error: mUserError } = await adminClient
    .from("m_user")
    .insert({
      supabase_auth_user_id: signUpData.user.id,
      email,
      role,
      created_program: "e2e-test",
      updated_program: "e2e-test",
    })
    .select("id")
    .single();

  if (mUserError || !mUserData) {
    throw new Error(`m_userレコード作成に失敗しました: ${mUserError?.message}`);
  }

  return {
    authUserId: signUpData.user.id,
    mUserId: mUserData.id,
    email,
    password,
    supabase: adminClient,
  };
}

/**
 * E2Eテスト用ユーザーを削除
 *
 * @param user - テストユーザー情報
 *
 * @example
 * ```typescript
 * await cleanupE2ETestUser(user);
 * ```
 */
export async function cleanupE2ETestUser(user: E2ETestUser): Promise<void> {
  try {
    // m_userテーブルのレコードを削除
    await user.supabase
      .from("m_user")
      .delete()
      .eq("supabase_auth_user_id", user.authUserId);

    // auth.usersのユーザーを削除
    await user.supabase.auth.admin.deleteUser(user.authUserId);
  } catch (error) {
    console.error("テストユーザーのクリーンアップに失敗:", error);
    // クリーンアップエラーは無視（テスト実行には影響しない）
  }
}

/**
 * 複数のE2Eテストユーザーを一括削除
 *
 * @param users - テストユーザー情報の配列
 */
export async function cleanupE2ETestUsers(users: E2ETestUser[]): Promise<void> {
  await Promise.all(users.map((user) => cleanupE2ETestUser(user)));
}
