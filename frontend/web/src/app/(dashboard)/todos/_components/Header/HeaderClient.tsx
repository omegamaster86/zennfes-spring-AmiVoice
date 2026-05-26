"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "../../_actions/auth";

type Props = {
  email?: string;
};

/**
 * ヘッダークライアントコンポーネント
 * ユーザーメニュー（shadcn DropdownMenu）を管理
 */
export function HeaderClient({ email }: Props) {
  return (
    <div className="flex items-center space-x-4">
      {/* 検索バー */}
      <div className="hidden md:block">
        <div className="relative">
          <input
            type="text"
            placeholder="検索..."
            className="w-64 rounded-lg border border-input bg-secondary px-4 py-2 pl-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>検索アイコン</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* 通知アイコン */}
      <button
        type="button"
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>通知アイコン</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
      </button>

      {/* ユーザーメニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center space-x-3 rounded-lg p-2 hover:bg-accent"
          >
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-foreground">
                {email ?? ""}
              </p>
            </div>
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>メニューアイコン</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/profile">アカウント設定</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={logoutAction}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                ログアウト
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
