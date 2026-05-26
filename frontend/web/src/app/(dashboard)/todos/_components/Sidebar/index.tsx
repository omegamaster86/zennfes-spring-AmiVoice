import { SidebarClient } from "./SidebarClient";
import type { MenuItem } from "./types";

/**
 * サイドバーコンポーネント（Server Component）
 * 各画面への遷移リンクを表示
 * メニュー項目の定義とレイアウト構造を管理
 */
export function Sidebar() {
  const menuItems: MenuItem[] = [
    {
      name: "ToDo",
      href: "/todos",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>ToDosアイコン</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      name: "検索",
      href: "/search",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>検索アイコン</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z"
          />
        </svg>
      ),
    },
    {
      name: "購入",
      href: "/purchases",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>購入アイコン</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293A1 1 0 005.414 17H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      name: "サブスクリプション",
      href: "/subscriptions",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>サブスクリプションアイコン</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
    },
    {
      name: "支払い方法",
      href: "/payment-methods",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>支払い方法アイコン</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm2 8h4"
          />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card">
      {/* サイドバーヘッダー */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <h1 className="text-lg font-semibold text-foreground">メニュー</h1>
      </div>

      {/* メニューリスト（Client Component） */}
      <SidebarClient menuItems={menuItems} />

      {/* サイドバーフッター */}
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-primary/10 p-4">
          <p className="text-sm font-medium text-primary">
            ヘルプが必要ですか？
          </p>
          <p className="mt-1 text-xs text-primary/70">
            サポートチームにお問い合わせください
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            お問い合わせ
          </button>
        </div>
      </div>
    </aside>
  );
}
