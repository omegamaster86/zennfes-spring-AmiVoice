import { createMockStore, resetMockStore } from "../index";

/**
 * 認証ストアのユーザー型定義
 */
type MockUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

/**
 * 認証ストアの型定義
 */
type AuthStoreData = {
  currentUser: MockUser | null;
  users: MockUser[];
};

/**
 * 初期データ
 * デモ用のテストユーザーを登録
 */
const initialAuthData: AuthStoreData = {
  currentUser: null,
  users: [
    {
      id: "demo-user-1",
      email: "demo@example.com",
      name: "デモユーザー",
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-user-2",
      email: "test@example.com",
      name: "テストユーザー",
      createdAt: new Date().toISOString(),
    },
  ],
};

/**
 * 認証ストアを取得
 * グローバルストアから取得し、存在しない場合は初期化
 */
function getAuthStore(): AuthStoreData {
  return createMockStore<AuthStoreData>("demo:auth", initialAuthData);
}

// ============================================
// データストアアクセス関数
// ============================================

/**
 * 現在のログイン中ユーザーを取得
 *
 * @returns 現在のユーザー、ログインしていない場合はnull
 */
export function getCurrentUser(): MockUser | null {
  return getAuthStore().currentUser;
}

/**
 * メールアドレスでユーザーを検索
 *
 * @param email メールアドレス
 * @returns 見つかったユーザー、存在しない場合はnull
 */
export function findUserByEmail(email: string): MockUser | null {
  const store = getAuthStore();
  return store.users.find((user) => user.email === email) || null;
}

/**
 * ユーザーをログイン状態にする
 *
 * @param user ログインするユーザー
 */
export function setCurrentUser(user: MockUser): void {
  const store = getAuthStore();
  store.currentUser = user;
  console.log("[MOCK AUTH] ログイン成功:", user.email);
}

/**
 * ユーザーをログアウト状態にする
 */
export function clearCurrentUser(): void {
  const store = getAuthStore();
  store.currentUser = null;
  console.log("[MOCK AUTH] ログアウト成功");
}

/**
 * 新しいユーザーを登録
 *
 * @param email メールアドレス
 * @param name 名前
 * @returns 登録されたユーザー
 */
export function registerUser(email: string, name: string): MockUser {
  const store = getAuthStore();

  const newUser: MockUser = {
    id: `demo-user-${Date.now()}`,
    email,
    name,
    createdAt: new Date().toISOString(),
  };

  store.users.push(newUser);
  console.log("[MOCK AUTH] ユーザー登録成功:", newUser.email);

  return newUser;
}

/**
 * 登録済みユーザー一覧を取得
 *
 * @returns ユーザー配列
 */
export function getAllUsers(): MockUser[] {
  return getAuthStore().users;
}

/**
 * 認証ストアをリセット
 */
export function resetAuthStore(): void {
  resetMockStore("demo:auth", initialAuthData);
}
