/**
 * Supabaseクライアント（管理者権限・サーバーサイド専用）
 *
 * Service Role Key を使用するため、絶対にクライアントへバンドルされないよう
 * `server-only` をインポートしています。LINE ログインのコールバックなど、
 * Supabase Admin API を使う必要があるサーバーサイドの処理から利用します。
 */

import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
