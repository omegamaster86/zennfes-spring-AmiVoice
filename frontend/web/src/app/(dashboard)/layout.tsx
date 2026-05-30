import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
// import { Header } from "./todos/_components/Header";
// import { Sidebar } from "./todos/_components/Sidebar";

export const metadata: Metadata = {
  title: "ダッシュボード",
  description: "ダッシュボード",
};

/**
 * ダッシュボードレイアウト
 * 認証済みユーザー用の共通レイアウト（Header + Sidebar）
 */
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* <Sidebar /> */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* <Header /> */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
