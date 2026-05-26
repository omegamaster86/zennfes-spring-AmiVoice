# Mock Store Service

Next.jsの開発環境でHMR（Hot Module Replacement）が発生してもデータが保持されるグローバルモックストアの仕組みです。

## 概要

このサービスは、データベースに接続せずにデモアプリを作成する際に使用します。`globalThis`を使用してデータを保持するため、以下の特徴があります：

- ✅ HMRでモジュールが再読み込みされてもデータが保持される
- ✅ サーバー再起動までデータが永続化される
- ✅ 型安全なストア管理
- ✅ 複数のストアを独立して管理可能

## 使用方法

### 1. 新しいストアを作成

```typescript
// src/services/mock-store/stores/user.ts
import { createMockStore, resetMockStore } from "../index";

type UserStoreData = {
  users: User[];
  nextId: number;
};

const initialUserData: UserStoreData = {
  users: [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ],
  nextId: 3,
};

function getUserStore(): UserStoreData {
  return createMockStore<UserStoreData>("demo:users", initialUserData);
}

export function getUsers() {
  return getUserStore().users;
}

export function addUser(user: User) {
  getUserStore().users.push(user);
}

export function resetUserStore() {
  resetMockStore("demo:users", initialUserData);
}
```

### 2. ストアを使用

```typescript
// Server ActionsやAPIで使用
import { getUsers, addUser } from "@/services/mock-store/stores/user";

export async function createUser(name: string, email: string) {
  const users = getUsers();
  const newUser = {
    id: users.length + 1,
    name,
    email,
  };
  addUser(newUser);
  return newUser;
}
```

### 3. ストア管理関数

```typescript
import {
  createMockStore,
  resetMockStore,
  deleteMockStore,
  clearAllMockStores,
  getMockStoreKeys,
} from "@/services/mock-store";

// ストアを作成または取得
const store = createMockStore("myStore", { data: [] });

// ストアをリセット（初期データに戻す）
resetMockStore("myStore", { data: [] });

// ストアを削除
deleteMockStore("myStore");

// すべてのストアをクリア
clearAllMockStores();

// 現在のストア一覧を取得（デバッグ用）
const stores = getMockStoreKeys();
console.log("現在のストア:", stores);
```

## ディレクトリ構造

```
src/services/mock-store/
├── index.ts              # グローバルストア管理の汎用的な仕組み
├── stores/
│   ├── todo.ts           # TODOストア
│   └── user.ts           # ユーザーストア（例）
└── README.md             # このファイル
```

## 既存のTODOストア

TODOストアは既に実装されています：

```typescript
import {
  getMockTodos,
  addMockTodo,
  updateMockTodo,
  removeMockTodo,
  resetTodoStore,
} from "@/services/mock-store/stores/todo";

// TODOリストを取得
const todos = getMockTodos();

// TODOを追加
addMockTodo({
  id: 4,
  title: "新しいTODO",
  description: "説明",
  priority: "high",
  status: "pending",
  createdAt: new Date().toISOString(),
});

// TODOを更新
updateMockTodo(4, { status: "completed" });

// TODOを削除
removeMockTodo(4);

// ストアをリセット
resetTodoStore();
```

## 注意事項

### 本番環境での使用について

- ⚠️ **デモ/開発環境専用**: 本番環境では使用しないでください
- ⚠️ **メモリリーク**: グローバル変数は解放されないため、適切なサイズ制限を検討してください
- ⚠️ **スケーリング不可**: 複数サーバーインスタンス間ではデータは共有されません

### 推奨用途

- ✅ デモアプリケーション
- ✅ プロトタイピング
- ✅ E2Eテスト用のモックデータ
- ✅ 開発環境でのクイックテスト

## ベストプラクティス

1. **ストアキーに名前空間を使用**
   ```typescript
   createMockStore("demo:todos", initialData);  // ✅ Good
   createMockStore("todos", initialData);        // ❌ Bad
   ```

2. **型を明示的に定義**
   ```typescript
   type MyStore = { items: string[] };
   createMockStore<MyStore>("demo:myStore", { items: [] });
   ```

3. **ストアごとに独立したファイルを作成**
   ```
   stores/
   ├── todo.ts
   ├── user.ts
   └── product.ts
   ```

4. **初期データを定数として定義**
   ```typescript
   const initialData = { /* ... */ };
   createMockStore("key", initialData);
   resetMockStore("key", initialData);  // 同じ初期データを使用
   ```

## トラブルシューティング

### データが保持されない

HMRでモジュールが再読み込みされても`globalThis`に保存されたデータは保持されます。サーバーを再起動すると初期化されます。

### 異なるWorker間でデータが共有されない

Next.jsの本番環境では複数のWorkerが使用されることがあります。この場合、各Worker間でデータは共有されません。デモ/開発環境専用として使用してください。

