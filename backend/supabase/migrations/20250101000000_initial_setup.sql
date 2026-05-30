-- =====================================================
-- 統合マイグレーション
-- 説明: 全テーブル・関数・RLSポリシー・Storageポリシーの初期セットアップ
-- 主キーは UUID v7 を使用
-- =====================================================

-- =====================================================
-- UUID v7 生成関数
-- =====================================================

CREATE OR REPLACE FUNCTION generate_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE PARALLEL SAFE
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = unix_ts_ms || extensions.gen_random_bytes(10);
  -- version 7
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  -- variant RFC 4122
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$;

COMMENT ON FUNCTION generate_uuid_v7() IS 'RFC 9562 準拠の UUID v7 を生成（タイムスタンプ順ソート可能）';

-- =====================================================
-- テーブル作成: m_user (ユーザーマスタ)
-- =====================================================

CREATE TABLE IF NOT EXISTS m_user (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  supabase_auth_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NULL,
  created_program TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NULL,
  updated_program TEXT NOT NULL,
  patched_at TIMESTAMPTZ NULL,
  patched_by TEXT NULL,
  lock_no BIGINT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT m_user_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT m_user_role_check CHECK (role IN ('admin', 'user', 'guest'))
);

CREATE INDEX IF NOT EXISTS idx_m_user_supabase_auth_user_id ON m_user(supabase_auth_user_id);
CREATE INDEX IF NOT EXISTS idx_m_user_email ON m_user(email);
CREATE INDEX IF NOT EXISTS idx_m_user_deleted_at ON m_user(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE m_user IS 'ユーザーマスタテーブル - アプリケーションのユーザー情報を管理';
COMMENT ON COLUMN m_user.id IS '主キー (UUID v7)';
COMMENT ON COLUMN m_user.supabase_auth_user_id IS 'Supabase認証ユーザーID (auth.users.id への参照)';
COMMENT ON COLUMN m_user.email IS 'メールアドレス';
COMMENT ON COLUMN m_user.role IS 'ユーザーロール (admin, user, guest)';
COMMENT ON COLUMN m_user.created_at IS 'レコード作成日時';
COMMENT ON COLUMN m_user.created_by IS '作成者 (ユーザーID または NULL)';
COMMENT ON COLUMN m_user.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN m_user.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN m_user.updated_by IS '最終更新者 (ユーザーID または NULL)';
COMMENT ON COLUMN m_user.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN m_user.patched_at IS 'パッチ更新日時 (緊急修正時に使用)';
COMMENT ON COLUMN m_user.patched_by IS 'パッチ更新者';
COMMENT ON COLUMN m_user.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN m_user.deleted_at IS '論理削除日時 (NULL=有効)';

-- =====================================================
-- RLS: m_user
-- =====================================================

ALTER TABLE m_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "m_user_select_own"
ON m_user FOR SELECT
USING (
  auth.uid() = supabase_auth_user_id
  AND deleted_at IS NULL
);

CREATE POLICY "m_user_update_own"
ON m_user FOR UPDATE
USING (
  auth.uid() = supabase_auth_user_id
  AND deleted_at IS NULL
)
WITH CHECK (
  auth.uid() = supabase_auth_user_id
  AND deleted_at IS NULL
);

CREATE POLICY "m_user_insert_own"
ON m_user FOR INSERT
WITH CHECK (
  auth.uid() = supabase_auth_user_id
);

-- =====================================================
-- ヘルパー関数
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT id FROM m_user
    WHERE supabase_auth_user_id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM m_user
    WHERE supabase_auth_user_id = auth.uid()
    AND role = 'admin'
    AND deleted_at IS NULL
  );
END;
$$;

-- m_user 管理者・service_role ポリシー

CREATE POLICY "m_user_select_admin"
ON m_user FOR SELECT
USING (is_admin());

CREATE POLICY "m_user_update_admin"
ON m_user FOR UPDATE
USING (is_admin());

CREATE POLICY "m_user_service_role_all"
ON m_user FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- テーブル作成: t_todo (ToDoトランザクション)
-- =====================================================

CREATE TABLE IF NOT EXISTS t_todo (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NULL,
  created_program TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NULL,
  updated_program TEXT NOT NULL,
  patched_at TIMESTAMPTZ NULL,
  patched_by TEXT NULL,
  lock_no BIGINT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT t_todo_user_id_fkey FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT t_todo_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT t_todo_priority_check CHECK (priority IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_t_todo_user_id ON t_todo(user_id);
CREATE INDEX IF NOT EXISTS idx_t_todo_status ON t_todo(status);
CREATE INDEX IF NOT EXISTS idx_t_todo_deleted_at ON t_todo(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_t_todo_due_date ON t_todo(due_date) WHERE due_date IS NOT NULL;

COMMENT ON TABLE t_todo IS 'ToDoトランザクションテーブル - ユーザーのToDo管理';
COMMENT ON COLUMN t_todo.id IS '主キー (UUID v7)';
COMMENT ON COLUMN t_todo.user_id IS 'ユーザーID (m_user.id への参照)';
COMMENT ON COLUMN t_todo.title IS 'ToDoタイトル';
COMMENT ON COLUMN t_todo.description IS 'ToDo詳細説明';
COMMENT ON COLUMN t_todo.status IS 'ステータス (pending, in_progress, completed, cancelled)';
COMMENT ON COLUMN t_todo.priority IS '優先度 (low, medium, high)';
COMMENT ON COLUMN t_todo.due_date IS '期限日時';
COMMENT ON COLUMN t_todo.completed_at IS '完了日時';
COMMENT ON COLUMN t_todo.created_at IS 'レコード作成日時';
COMMENT ON COLUMN t_todo.created_by IS '作成者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_todo.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_todo.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN t_todo.updated_by IS '最終更新者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_todo.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_todo.patched_at IS 'パッチ更新日時 (緊急修正時に使用)';
COMMENT ON COLUMN t_todo.patched_by IS 'パッチ更新者';
COMMENT ON COLUMN t_todo.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN t_todo.deleted_at IS '論理削除日時 (NULL=有効)';

-- =====================================================
-- RLS: t_todo
-- =====================================================

ALTER TABLE t_todo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "t_todo_select_own"
ON t_todo FOR SELECT
USING (
  user_id = get_current_user_id()
  AND deleted_at IS NULL
);

CREATE POLICY "t_todo_insert_own"
ON t_todo FOR INSERT
WITH CHECK (
  user_id = get_current_user_id()
);

CREATE POLICY "t_todo_update_own"
ON t_todo FOR UPDATE
USING (
  user_id = get_current_user_id()
  AND deleted_at IS NULL
)
WITH CHECK (
  user_id = get_current_user_id()
  AND deleted_at IS NULL
);

CREATE POLICY "t_todo_delete_own"
ON t_todo FOR UPDATE
USING (
  user_id = get_current_user_id()
);

CREATE POLICY "t_todo_select_admin"
ON t_todo FOR SELECT
USING (is_admin());

CREATE POLICY "t_todo_service_role_all"
ON t_todo FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- テーブル作成: t_user_fcm_token (FCMトークン)
-- =====================================================

CREATE TABLE IF NOT EXISTS t_user_fcm_token (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  user_id UUID NOT NULL REFERENCES m_user(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  platform TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NULL,
  created_program TEXT NOT NULL DEFAULT 'set-fcm-token',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NULL,
  updated_program TEXT NOT NULL DEFAULT 'set-fcm-token',
  patched_at TIMESTAMPTZ NULL,
  patched_by TEXT NULL,
  lock_no BIGINT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_t_user_fcm_token_platform
    CHECK (platform IS NULL OR platform IN ('android', 'ios'))
);

CREATE INDEX IF NOT EXISTS idx_t_user_fcm_token_user_id
  ON t_user_fcm_token(user_id);
CREATE INDEX IF NOT EXISTS idx_t_user_fcm_token_deleted_at
  ON t_user_fcm_token(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE t_user_fcm_token IS 'ユーザー端末ごとのFCMトークン';
COMMENT ON COLUMN t_user_fcm_token.id IS '主キー (UUID v7)';
COMMENT ON COLUMN t_user_fcm_token.user_id IS 'ユーザーID (m_user.id への参照)';
COMMENT ON COLUMN t_user_fcm_token.fcm_token IS 'Firebase Cloud Messaging device token';
COMMENT ON COLUMN t_user_fcm_token.platform IS '端末プラットフォーム(android/ios)';
COMMENT ON COLUMN t_user_fcm_token.created_at IS 'レコード作成日時';
COMMENT ON COLUMN t_user_fcm_token.created_by IS '作成者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_user_fcm_token.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_user_fcm_token.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN t_user_fcm_token.updated_by IS '最終更新者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_user_fcm_token.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_user_fcm_token.patched_at IS 'パッチ更新日時 (緊急修正時に使用)';
COMMENT ON COLUMN t_user_fcm_token.patched_by IS 'パッチ更新者';
COMMENT ON COLUMN t_user_fcm_token.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN t_user_fcm_token.deleted_at IS '論理削除日時 (NULL=有効)';

-- =====================================================
-- RLS: t_user_fcm_token
-- =====================================================

ALTER TABLE t_user_fcm_token ENABLE ROW LEVEL SECURITY;

CREATE POLICY "t_user_fcm_token_select_own"
ON t_user_fcm_token FOR SELECT
USING (
  user_id = get_current_user_id()
);

CREATE POLICY "t_user_fcm_token_insert_own"
ON t_user_fcm_token FOR INSERT
WITH CHECK (
  user_id = get_current_user_id()
);

CREATE POLICY "t_user_fcm_token_update_own"
ON t_user_fcm_token FOR UPDATE
USING (
  user_id = get_current_user_id()
)
WITH CHECK (
  user_id = get_current_user_id()
);

CREATE POLICY "t_user_fcm_token_delete_own"
ON t_user_fcm_token FOR DELETE
USING (
  user_id = get_current_user_id()
);

CREATE POLICY "t_user_fcm_token_select_admin"
ON t_user_fcm_token FOR SELECT
USING (is_admin());

CREATE POLICY "t_user_fcm_token_service_role_all"
ON t_user_fcm_token FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- テーブル作成: t_file_upload (ファイルアップロード)
-- =====================================================

CREATE TABLE IF NOT EXISTS t_file_upload (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  user_id UUID NOT NULL,
  bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  original_name TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NULL,
  created_program TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NULL,
  updated_program TEXT NOT NULL,
  patched_at TIMESTAMPTZ NULL,
  patched_by TEXT NULL,
  lock_no BIGINT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT t_file_upload_user_id_fkey FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT t_file_upload_size_bytes_check CHECK (size_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_t_file_upload_user_id ON t_file_upload(user_id);
CREATE INDEX IF NOT EXISTS idx_t_file_upload_bucket ON t_file_upload(bucket);
CREATE INDEX IF NOT EXISTS idx_t_file_upload_deleted_at ON t_file_upload(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE t_file_upload IS 'ファイルアップロード履歴テーブル - Supabase Storage と連携';
COMMENT ON COLUMN t_file_upload.id IS '主キー (UUID v7)';
COMMENT ON COLUMN t_file_upload.user_id IS 'ユーザーID (m_user.id への参照)';
COMMENT ON COLUMN t_file_upload.bucket IS 'Supabase Storage バケット名';
COMMENT ON COLUMN t_file_upload.storage_path IS 'Storage 内のファイルパス';
COMMENT ON COLUMN t_file_upload.file_name IS 'Storage上の生成ファイル名 (例: 1776675823381_n6swg8.jpg)';
COMMENT ON COLUMN t_file_upload.original_name IS 'アップロード時の元ファイル名';
COMMENT ON COLUMN t_file_upload.size_bytes IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN t_file_upload.mime_type IS 'MIME タイプ';
COMMENT ON COLUMN t_file_upload.url IS '公開URL';
COMMENT ON COLUMN t_file_upload.created_at IS 'レコード作成日時';
COMMENT ON COLUMN t_file_upload.created_by IS '作成者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_file_upload.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_file_upload.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN t_file_upload.updated_by IS '最終更新者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_file_upload.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_file_upload.patched_at IS 'パッチ更新日時 (緊急修正時に使用)';
COMMENT ON COLUMN t_file_upload.patched_by IS 'パッチ更新者';
COMMENT ON COLUMN t_file_upload.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN t_file_upload.deleted_at IS '論理削除日時 (NULL=有効)';

-- =====================================================
-- RLS: t_file_upload
-- =====================================================

ALTER TABLE t_file_upload ENABLE ROW LEVEL SECURITY;

CREATE POLICY "t_file_upload_select_own"
ON t_file_upload FOR SELECT
USING (
  user_id = get_current_user_id()
  AND deleted_at IS NULL
);

CREATE POLICY "t_file_upload_insert_own"
ON t_file_upload FOR INSERT
WITH CHECK (
  user_id = get_current_user_id()
);

CREATE POLICY "t_file_upload_update_own"
ON t_file_upload FOR UPDATE
USING (
  user_id = get_current_user_id()
  AND deleted_at IS NULL
)
WITH CHECK (
  user_id = get_current_user_id()
);

CREATE POLICY "t_file_upload_select_admin"
ON t_file_upload FOR SELECT
USING (is_admin());

CREATE POLICY "t_file_upload_service_role_all"
ON t_file_upload FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- Storage バケット RLS ポリシー: sample-bucket
-- ファイルパス規約: {auth.uid()}/{任意のサブパス}/{ファイル名}
-- =====================================================

CREATE POLICY "sample_bucket_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sample-bucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "sample_bucket_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'sample-bucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "sample_bucket_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sample-bucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'sample-bucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "sample_bucket_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sample-bucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "sample_bucket_service_role_all"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'sample-bucket')
WITH CHECK (bucket_id = 'sample-bucket');

-- =====================================================
-- RPC 関数: ins_m_user
-- =====================================================

CREATE OR REPLACE FUNCTION ins_m_user(
  p_auth_user_id UUID,
  p_email TEXT,
  p_created_program TEXT DEFAULT 'create-user'
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO m_user (
    supabase_auth_user_id,
    email,
    role,
    created_program,
    updated_program,
    lock_no
  ) VALUES (
    p_auth_user_id,
    p_email,
    'user',
    p_created_program,
    p_created_program,
    0
  )
  RETURNING m_user.id, m_user.email, m_user.role;
END;
$$;

COMMENT ON FUNCTION ins_m_user(UUID, TEXT, TEXT) IS 'Supabase Auth ユーザーIDからm_userレコードを作成';

-- =====================================================
-- RPC 関数: sel_todos_by_user
-- =====================================================

CREATE OR REPLACE FUNCTION sel_todos_by_user(target_auth_user_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE supabase_auth_user_id = target_auth_user_id
    AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority
  FROM
    t_todo t
  WHERE
    t.user_id = v_user_id
    AND t.deleted_at IS NULL
  ORDER BY
    CASE 
      WHEN t.status = 'in_progress' THEN 1
      WHEN t.status = 'pending' THEN 2
      WHEN t.status = 'completed' THEN 3
      ELSE 4
    END,
    CASE t.priority
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
      ELSE 4
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC;
END;
$$;

COMMENT ON FUNCTION sel_todos_by_user(UUID) IS '認証ユーザーIDに紐づくToDo一覧を取得（優先度とステータスでソート）';

-- =====================================================
-- RPC 関数: ins_todo
-- =====================================================

CREATE OR REPLACE FUNCTION ins_todo(
  p_auth_user_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_due_date TIMESTAMPTZ DEFAULT NULL,
  p_created_program TEXT DEFAULT 'dashboard/create-todo'
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_new_id UUID;
BEGIN
  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが見つかりません: %', p_auth_user_id;
  END IF;

  INSERT INTO t_todo (
    user_id,
    title,
    description,
    status,
    priority,
    due_date,
    created_program,
    updated_program,
    lock_no
  ) VALUES (
    v_user_id,
    p_title,
    p_description,
    'pending',
    p_priority,
    p_due_date,
    p_created_program,
    p_created_program,
    0
  )
  RETURNING t_todo.id INTO v_new_id;

  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority
  FROM
    t_todo t
  WHERE
    t.id = v_new_id;
END;
$$;

COMMENT ON FUNCTION ins_todo(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) IS '認証ユーザーIDから新しいToDoを作成して返却';

-- =====================================================
-- RPC 関数: upd_todo_status
-- =====================================================

CREATE OR REPLACE FUNCTION upd_todo_status(
  p_todo_id UUID,
  p_status TEXT,
  p_updated_program TEXT DEFAULT 'dashboard/update-todo'
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE t_todo
  SET 
    status = p_status,
    completed_at = CASE 
      WHEN p_status = 'completed' THEN CURRENT_TIMESTAMP 
      ELSE NULL 
    END,
    updated_at = CURRENT_TIMESTAMP,
    updated_program = p_updated_program,
    lock_no = lock_no + 1
  WHERE
    t_todo.id = p_todo_id
    AND t_todo.deleted_at IS NULL;

  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority
  FROM
    t_todo t
  WHERE
    t.id = p_todo_id;
END;
$$;

COMMENT ON FUNCTION upd_todo_status(UUID, TEXT, TEXT) IS 'ToDoのステータスを更新（completedの場合、completed_atも設定）';

-- =====================================================
-- RPC 関数: ins_file_upload
-- =====================================================

CREATE OR REPLACE FUNCTION ins_file_upload(
  p_auth_user_id UUID,
  p_bucket TEXT,
  p_storage_path TEXT,
  p_original_name TEXT,
  p_size_bytes BIGINT,
  p_mime_type TEXT DEFAULT NULL,
  p_url TEXT DEFAULT '',
  p_file_name TEXT DEFAULT '',
  p_created_program TEXT DEFAULT 'save-file-record'
)
RETURNS TABLE(
  out_id UUID,
  out_bucket TEXT,
  out_storage_path TEXT,
  out_file_name TEXT,
  out_original_name TEXT,
  out_size_bytes BIGINT,
  out_mime_type TEXT,
  out_url TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_new_id UUID;
BEGIN
  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが見つかりません: %', p_auth_user_id;
  END IF;

  INSERT INTO t_file_upload (
    user_id,
    bucket,
    storage_path,
    file_name,
    original_name,
    size_bytes,
    mime_type,
    url,
    created_program,
    updated_program,
    lock_no
  ) VALUES (
    v_user_id,
    p_bucket,
    p_storage_path,
    p_file_name,
    p_original_name,
    p_size_bytes,
    p_mime_type,
    p_url,
    p_created_program,
    p_created_program,
    0
  )
  RETURNING t_file_upload.id INTO v_new_id;

  RETURN QUERY
  SELECT
    f.id,
    f.bucket,
    f.storage_path,
    f.file_name,
    f.original_name,
    f.size_bytes,
    f.mime_type,
    f.url
  FROM
    t_file_upload f
  WHERE
    f.id = v_new_id;
END;
$$;

COMMENT ON FUNCTION ins_file_upload(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT) IS 'ファイルアップロード履歴を登録して返却';

-- =====================================================
-- RPC 関数: del_file_upload
-- =====================================================

CREATE OR REPLACE FUNCTION del_file_upload(
  p_auth_user_id UUID,
  p_file_id UUID,
  p_updated_program TEXT DEFAULT 'delete-file-record'
)
RETURNS TABLE(
  out_id UUID,
  out_bucket TEXT,
  out_storage_path TEXT,
  out_original_name TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが見つかりません: %', p_auth_user_id;
  END IF;

  UPDATE t_file_upload
  SET
    deleted_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP,
    updated_program = p_updated_program,
    lock_no = t_file_upload.lock_no + 1
  WHERE
    t_file_upload.id = p_file_id
    AND t_file_upload.user_id = v_user_id
    AND t_file_upload.deleted_at IS NULL;

  RETURN QUERY
  SELECT
    f.id,
    f.bucket,
    f.storage_path,
    f.original_name
  FROM
    t_file_upload f
  WHERE
    f.id = p_file_id;
END;
$$;

COMMENT ON FUNCTION del_file_upload(UUID, UUID, TEXT) IS 'ファイルアップロード履歴を論理削除し、Storage削除用の情報を返却';
