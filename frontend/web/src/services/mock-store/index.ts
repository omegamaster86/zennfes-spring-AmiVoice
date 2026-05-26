/**
 * グローバルモックストア管理
 *
 * Next.jsの開発環境でHMR（Hot Module Replacement）が発生しても
 * データが保持されるように、globalThisを使用してデータを管理します。
 *
 * 使用例：
 * ```typescript
 * const store = createMockStore('myStore', { data: [], count: 0 });
 * store.data.push(item);
 * ```
 */

/**
 * グローバルストアのコンテナ型
 */
type GlobalMockStoreContainer = {
  [key: string]: unknown;
};

/**
 * グローバルオブジェクトにモックストアコンテナを定義
 */
const globalForMockStore = globalThis as unknown as {
  __mockStoreContainer: GlobalMockStoreContainer | undefined;
};

/**
 * グローバルストアコンテナの初期化（まだ存在しない場合のみ）
 */
if (!globalForMockStore.__mockStoreContainer) {
  globalForMockStore.__mockStoreContainer = {};
}

/**
 * グローバルストアコンテナへの参照
 */
const container = globalForMockStore.__mockStoreContainer;

/**
 * モックストアを作成または取得
 *
 * @param key ストアを識別するユニークなキー
 * @param initialData 初期データ（ストアが存在しない場合に使用）
 * @returns ストアデータへの参照
 *
 * @example
 * ```typescript
 * type MyStore = { items: string[]; count: number };
 * const store = createMockStore<MyStore>('myApp', {
 *   items: [],
 *   count: 0
 * });
 *
 * store.items.push('new item');
 * store.count++;
 * ```
 */
export function createMockStore<T extends object>(
  key: string,
  initialData: T,
): T {
  // ストアが存在しない場合は初期化
  if (!container[key]) {
    container[key] = initialData;
    console.log(`[MOCK STORE] ストア "${key}" を初期化しました`);
  }

  return container[key] as T;
}

/**
 * ストアをリセット（初期データに戻す）
 *
 * @param key ストアを識別するユニークなキー
 * @param initialData 初期データ
 *
 * @example
 * ```typescript
 * resetMockStore('myApp', { items: [], count: 0 });
 * ```
 */
export function resetMockStore<T extends object>(
  key: string,
  initialData: T,
): void {
  container[key] = initialData;
  console.log(`[MOCK STORE] ストア "${key}" をリセットしました`);
}

/**
 * ストアを削除
 *
 * @param key ストアを識別するユニークなキー
 *
 * @example
 * ```typescript
 * deleteMockStore('myApp');
 * ```
 */
export function deleteMockStore(key: string): void {
  delete container[key];
  console.log(`[MOCK STORE] ストア "${key}" を削除しました`);
}

/**
 * すべてのストアをクリア
 *
 * @example
 * ```typescript
 * clearAllMockStores();
 * ```
 */
export function clearAllMockStores(): void {
  const keys = Object.keys(container);
  keys.forEach((key) => {
    delete container[key];
  });
  console.log(
    `[MOCK STORE] すべてのストア (${keys.length}個) をクリアしました`,
  );
}

/**
 * 現在のストア一覧を取得（デバッグ用）
 *
 * @returns ストアキーの配列
 *
 * @example
 * ```typescript
 * const stores = getMockStoreKeys();
 * console.log('現在のストア:', stores);
 * ```
 */
export function getMockStoreKeys(): string[] {
  return Object.keys(container);
}
