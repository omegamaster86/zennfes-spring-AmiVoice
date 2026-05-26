-- =====================================================
-- ENUM 型への移行
-- 説明: m_user.role / t_todo.status / t_todo.priority / t_user_fcm_token.platform を
--       TEXT + CHECK 制約から PostgreSQL ENUM 型へ変換する
-- =====================================================

-- =====================================================
-- 1. ENUM 型の作成
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');
COMMENT ON TYPE user_role IS 'ユーザーロール (admin, user, guest)';

CREATE TYPE todo_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
COMMENT ON TYPE todo_status IS 'ToDo ステータス (pending, in_progress, completed, cancelled)';

CREATE TYPE todo_priority AS ENUM ('low', 'medium', 'high');
COMMENT ON TYPE todo_priority IS 'ToDo 優先度 (low, medium, high)';

CREATE TYPE fcm_platform AS ENUM ('android', 'ios');
COMMENT ON TYPE fcm_platform IS 'FCM トークン端末プラットフォーム (android, ios)';

-- =====================================================
-- 2. 既存 CHECK 制約の削除
--    (列の型変更に先立って、リテラル文字列を前提とした CHECK を落とす)
-- =====================================================

ALTER TABLE m_user DROP CONSTRAINT IF EXISTS m_user_role_check;
ALTER TABLE t_todo DROP CONSTRAINT IF EXISTS t_todo_status_check;
ALTER TABLE t_todo DROP CONSTRAINT IF EXISTS t_todo_priority_check;
ALTER TABLE t_user_fcm_token DROP CONSTRAINT IF EXISTS chk_t_user_fcm_token_platform;

-- =====================================================
-- 3. 既存 RPC 関数の削除
--    (戻り値シグネチャが TEXT → ENUM に変わるため、
--     列型変更前に DROP しないと依存で失敗する)
-- =====================================================

DROP FUNCTION IF EXISTS ins_m_user(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS sel_todos_by_user(UUID);
DROP FUNCTION IF EXISTS ins_todo(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS upd_todo_status(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS sel_todos_search(UUID, TEXT, INT, INT);

-- =====================================================
-- 4. 列型の変更
--    DEFAULT を一旦外してから TYPE を変換し、DEFAULT を再設定する
-- =====================================================

ALTER TABLE m_user
  ALTER COLUMN role DROP DEFAULT;
ALTER TABLE m_user
  ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE m_user
  ALTER COLUMN role SET DEFAULT 'user'::user_role;

ALTER TABLE t_todo
  ALTER COLUMN status DROP DEFAULT;
ALTER TABLE t_todo
  ALTER COLUMN status TYPE todo_status USING status::todo_status;
ALTER TABLE t_todo
  ALTER COLUMN status SET DEFAULT 'pending'::todo_status;

ALTER TABLE t_todo
  ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE t_todo
  ALTER COLUMN priority TYPE todo_priority USING priority::todo_priority;
ALTER TABLE t_todo
  ALTER COLUMN priority SET DEFAULT 'medium'::todo_priority;

ALTER TABLE t_user_fcm_token
  ALTER COLUMN platform TYPE fcm_platform USING platform::fcm_platform;

COMMENT ON COLUMN m_user.role IS 'ユーザーロール (user_role ENUM)';
COMMENT ON COLUMN t_todo.status IS 'ステータス (todo_status ENUM)';
COMMENT ON COLUMN t_todo.priority IS '優先度 (todo_priority ENUM)';
COMMENT ON COLUMN t_user_fcm_token.platform IS '端末プラットフォーム (fcm_platform ENUM)';

-- =====================================================
-- 5. RPC 関数の再作成 (ENUM 型シグネチャ)
-- =====================================================

-- -----------------------------------------------------
-- ins_m_user
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION ins_m_user(
  p_auth_user_id UUID,
  p_email TEXT,
  p_created_program TEXT DEFAULT 'create-user'
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  role user_role
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
    'user'::user_role,
    p_created_program,
    p_created_program,
    0
  )
  RETURNING m_user.id, m_user.email, m_user.role;
END;
$$;

COMMENT ON FUNCTION ins_m_user(UUID, TEXT, TEXT) IS 'Supabase Auth ユーザーIDから m_user レコードを作成';

-- -----------------------------------------------------
-- sel_todos_by_user
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION sel_todos_by_user(target_auth_user_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status todo_status,
  priority todo_priority
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
      WHEN t.status = 'in_progress'::todo_status THEN 1
      WHEN t.status = 'pending'::todo_status THEN 2
      WHEN t.status = 'completed'::todo_status THEN 3
      ELSE 4
    END,
    CASE t.priority
      WHEN 'high'::todo_priority THEN 1
      WHEN 'medium'::todo_priority THEN 2
      WHEN 'low'::todo_priority THEN 3
      ELSE 4
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC;
END;
$$;

COMMENT ON FUNCTION sel_todos_by_user(UUID) IS '認証ユーザーIDに紐づくToDo一覧を取得（優先度とステータスでソート）';

-- -----------------------------------------------------
-- ins_todo
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION ins_todo(
  p_auth_user_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_priority todo_priority DEFAULT 'medium'::todo_priority,
  p_due_date TIMESTAMPTZ DEFAULT NULL,
  p_created_program TEXT DEFAULT 'dashboard/create-todo'
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status todo_status,
  priority todo_priority
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
    'pending'::todo_status,
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

COMMENT ON FUNCTION ins_todo(UUID, TEXT, TEXT, todo_priority, TIMESTAMPTZ, TEXT) IS '認証ユーザーIDから新しいToDoを作成して返却';

-- -----------------------------------------------------
-- upd_todo_status
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION upd_todo_status(
  p_todo_id UUID,
  p_status todo_status,
  p_updated_program TEXT DEFAULT 'dashboard/update-todo'
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status todo_status,
  priority todo_priority
)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE t_todo
  SET
    status = p_status,
    completed_at = CASE
      WHEN p_status = 'completed'::todo_status THEN CURRENT_TIMESTAMP
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

COMMENT ON FUNCTION upd_todo_status(UUID, todo_status, TEXT) IS 'ToDoのステータスを更新（completedの場合、completed_atも設定）';

-- -----------------------------------------------------
-- sel_todos_search (pgroonga マイグレーションの関数を enum 型で再作成)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION sel_todos_search(
  target_auth_user_id UUID,
  p_keyword TEXT DEFAULT '',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status todo_status,
  priority todo_priority
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_keyword TEXT;
  v_limit INT;
  v_offset INT;
BEGIN
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);
  v_keyword := COALESCE(TRIM(p_keyword), '');

  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = target_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  IF v_keyword = '' THEN
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
        WHEN t.status = 'in_progress'::todo_status THEN 1
        WHEN t.status = 'pending'::todo_status THEN 2
        WHEN t.status = 'completed'::todo_status THEN 3
        ELSE 4
      END,
      CASE t.priority
        WHEN 'high'::todo_priority THEN 1
        WHEN 'medium'::todo_priority THEN 2
        WHEN 'low'::todo_priority THEN 3
        ELSE 4
      END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
    LIMIT v_limit OFFSET v_offset;
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
    AND (
      t.title &@~ v_keyword
      OR COALESCE(t.description, '') &@~ v_keyword
    )
  ORDER BY
    t.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION sel_todos_search(UUID, TEXT, INT, INT) IS '認証ユーザーのToDoを pgroonga でキーワード全文検索（title, description 対象）';
