import { type NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/services/logger";
import { createClient } from "@/services/supabase/server";

/**
 * Supabase Auth コールバックルート
 * パスワードリセットメール等のリンクから code を受け取り
 * セッションに交換して next パラメータのページへリダイレクトする
 */
export async function GET(request: NextRequest) {
  const logger = createLogger("auth/callback");
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/todos";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/todos";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session && data.user) {
      // メール確認完了後に m_user レコードが未作成の場合に備えて create-user を呼び出す
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl && data.user.email) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ email: data.user.email }),
          });
          if (!res.ok) {
            logger.warn("create_user_record_failed", { status: res.status });
          } else {
            logger.info("create_user_record_success", { userId: data.user.id });
          }
        } catch (err) {
          logger.error(err, { context: "create_user_in_callback" });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
