-- =====================================================
-- LINE 認証ユーザー解決用ヘルパー関数
-- 既存ユーザーを LINE sub / email で効率的に検索するための関数
-- service_role からのみ呼び出される想定 (Next.js サーバー側の LINE コールバック)
-- =====================================================

-- LINE sub (LINE ユーザー ID) から auth.users.id を検索する
-- NOTE: auth.users は supabase_auth_admin 所有のため、マイグレーション実行ロール
--       (postgres) から CREATE INDEX はできない。このため jsonb への検索は
--       シーケンシャルスキャンになるが、ユーザー数が数万規模までは実用上問題ない。
--       大規模化時は public スキーマに line_sub→user_id の連携テーブルを作る等で
--       インデックス化する運用を検討すること。
CREATE OR REPLACE FUNCTION find_auth_user_id_by_line_sub(p_sub TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id
  FROM auth.users
  WHERE raw_app_meta_data -> 'provider_ids' ->> 'line' = p_sub
  ORDER BY created_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION find_auth_user_id_by_line_sub(TEXT) IS
'LINE sub (LINE ユーザー ID) から auth.users.id を検索する。service_role 専用。';

REVOKE ALL ON FUNCTION find_auth_user_id_by_line_sub(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION find_auth_user_id_by_line_sub(TEXT) FROM anon;
REVOKE ALL ON FUNCTION find_auth_user_id_by_line_sub(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION find_auth_user_id_by_line_sub(TEXT) TO service_role;

-- email から auth.users.id を検索する
-- 既存メール/パスワードユーザーと LINE ユーザーを email でリンクする際に使用する
CREATE OR REPLACE FUNCTION find_auth_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  ORDER BY created_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION find_auth_user_id_by_email(TEXT) IS
'email から auth.users.id を検索する。service_role 専用。';

REVOKE ALL ON FUNCTION find_auth_user_id_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION find_auth_user_id_by_email(TEXT) FROM anon;
REVOKE ALL ON FUNCTION find_auth_user_id_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION find_auth_user_id_by_email(TEXT) TO service_role;
