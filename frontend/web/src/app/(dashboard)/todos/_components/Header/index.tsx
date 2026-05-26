import { createClient } from "@/services/supabase/server";
import { HeaderClient } from "./HeaderClient";

/**
 * ヘッダーコンポーネント（Server Component）
 * ロゴ、検索バー、ユーザー情報を表示
 * レイアウト構造を管理し、クライアント側の機能はHeaderClientに委譲
 */
export async function Header() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let email: string | undefined;
  if (session) {
    const { data: claimsData } = await supabase.auth.getClaims(
      session.access_token,
    );
    email = claimsData?.claims?.email as string | undefined;
  }

  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        {/* 左側：ロゴとタイトル */}
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                A
              </span>
            </div>
            <span className="ml-2 text-xl font-bold text-foreground">
              MyApp
            </span>
          </div>
        </div>

        {/* 右側：検索バーとユーザーメニュー（Client Component） */}
        <HeaderClient email={email} />
      </div>
    </header>
  );
}
