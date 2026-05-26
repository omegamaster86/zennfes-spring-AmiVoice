/**
 * ユーザー管理テストヘルパー（Deno/Supabase Functions専用）
 *
 * テストユーザーの作成を行うユーティリティ
 */

import { createClient, type SupabaseClient } from "@supabase/client";

/**
 * テストユーザー情報の型定義
 */
export interface TestUser {
  authUserId: string; // auth.users.id
  mUserId: string; // m_user.id (UUID v7)
  accessToken: string;
  supabase: SupabaseClient;
}

/**
 * テストユーザーを作成してアクセストークンを取得
 *
 * @param email - ユーザーのメールアドレス
 * @param password - ユーザーのパスワード
 * @param createdProgram - 作成プログラム名（デフォルト: "test-helpers"）
 * @returns テストユーザー情報
 *
 * @example
 * ```typescript
 * const user = await createTestUser("test@example.com", "password123", "test-function");
 * // テスト実行...
 * // クリーンアップは各テストファイルで実装
 * ```
 */
export async function createTestUser(
  email: string,
  password: string,
  createdProgram = "test-helpers",
): Promise<TestUser> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase環境変数が設定されていません");
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false },
  });

  // 既存ユーザーがいる場合は削除（管理者権限が必要）
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    throw new Error("SERVICE_ROLE_KEY環境変数が設定されていません");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 既存のauth.usersユーザーを削除
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === email);
  if (existingUser) {
    // m_userテーブルのレコードを先に削除（RLSをバイパスするためservice_roleで削除）
    await adminClient
      .from("m_user")
      .delete()
      .eq("supabase_auth_user_id", existingUser.id);
    // auth.usersのユーザーを削除
    await adminClient.auth.admin.deleteUser(existingUser.id);
  }

  // 新規ユーザー作成（auth.users）
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    throw new Error(`ユーザー作成に失敗しました: ${signUpError?.message}`);
  }

  // サインイン（アクセストークン取得）
  const { data: signInData, error: signInError } = await supabase.auth
    .signInWithPassword({
      email,
      password,
    });

  if (signInError || !signInData.session) {
    throw new Error(`サインインに失敗しました: ${signInError?.message}`);
  }

  // m_userテーブルにレコードを作成（service_roleを使用してRLSをバイパス）
  const { data: mUserData, error: mUserError } = await adminClient
    .from("m_user")
    .insert({
      supabase_auth_user_id: signUpData.user.id,
      email,
      role: "user",
      created_program: createdProgram,
      updated_program: createdProgram,
    })
    .select("id")
    .single();

  if (mUserError || !mUserData) {
    throw new Error(`m_userレコード作成に失敗しました: ${mUserError?.message}`);
  }

  return {
    authUserId: signUpData.user.id,
    mUserId: mUserData.id,
    accessToken: signInData.session.access_token,
    supabase: adminClient,
  };
}

/**
 * テストユーザーを削除
 *
 * @param authUserId - auth.users.id
 * @param supabase - Supabaseクライアント（service_role推奨）
 *
 * @example
 * ```typescript
 * await cleanupTestUser(user.authUserId, user.supabase);
 * ```
 */
export async function cleanupTestUser(
  authUserId: string,
  supabase: SupabaseClient,
): Promise<void> {
  // m_userテーブルのレコードを削除（service_roleでRLSをバイパス）
  await supabase
    .from("m_user")
    .delete()
    .eq("supabase_auth_user_id", authUserId);

  // auth.usersのユーザーを削除
  await supabase.auth.admin.deleteUser(authUserId);

  await supabase.removeAllChannels();
}
