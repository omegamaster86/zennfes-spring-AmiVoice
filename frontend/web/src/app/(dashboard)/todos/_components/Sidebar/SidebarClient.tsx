"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/class-name";
import type { MenuItem } from "./types";

/**
 * サイドバークライアントコンポーネント
 * クライアントサイドのナビゲーション状態を管理
 */
type SidebarClientProps = {
  menuItems: MenuItem[];
};

export function SidebarClient({ menuItems }: SidebarClientProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {menuItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <span
              className={cn(
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {item.icon}
            </span>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
