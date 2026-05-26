// ========================================
// Supabaseクライアント作成ユーティリティ
// ========================================

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js";
import type { Database } from "./database.types.ts";

/**
 * 認証なしのSupabaseクライアントを作成
 */
export function createClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );
}

/**
 * 認証トークン付きのSupabaseクライアントを作成
 */
export function createAuthenticatedClient(
  authHeader: string,
): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );
}

/**
 * 管理者権限のSupabaseクライアントを作成（service_role キー使用）
 */
export function createAdminClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

/**
 * Supabase RPC を呼び出す
 * 管理者操作は { admin: true } で service_role に切替
 *
 * 引数 `name` は呼び出し側で動的に決まるため、生成された厳密な
 * リテラル ユニオン型に縛らずに `string` として受け付ける。
 */
export async function callRpc(
  req: Request,
  name: string,
  args: Record<string, unknown>,
  options?: { admin?: boolean },
): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = options?.admin
    ? createSupabaseClient<Database>(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      )
    : createAuthenticatedClient(req.headers.get("Authorization") ?? "");

  const rpcClient = client as unknown as {
    rpc: (
      rpcName: string,
      rpcArgs: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await rpcClient.rpc(name, args);
  return { data, error };
}
