-- =====================================================
-- Stripe 決済基盤マイグレーション
-- 説明:
--   - m_user に Stripe Customer ID 列を追加
--   - m_stripe_payment_method テーブルを新規作成
--   - 支払い方法 CRUD 用 RPC 関数を作成
--   - RLS ポリシーを設定（service_role 経由のみ書き込み許可）
-- =====================================================

-- =====================================================
-- 1. m_user への stripe_customer_id 列追加
-- =====================================================

ALTER TABLE m_user
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_m_user_stripe_customer_id
  ON m_user(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN m_user.stripe_customer_id IS 'Stripe Customer ID (cus_xxx) - 1ユーザー1顧客';

-- =====================================================
-- 2. payment_method_type ENUM
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
    CREATE TYPE payment_method_type AS ENUM ('card');
  END IF;
END$$;

COMMENT ON TYPE payment_method_type IS 'Stripe 支払い方法種別 (現状 card のみ)';

-- =====================================================
-- 3. m_stripe_payment_method テーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS m_stripe_payment_method (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  user_id UUID NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  type payment_method_type NOT NULL DEFAULT 'card',
  card_brand TEXT NULL,
  card_last4 TEXT NULL,
  card_exp_month TEXT NULL,
  card_exp_year TEXT NULL,
  card_holder_name TEXT NULL,
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
  CONSTRAINT m_stripe_payment_method_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT m_stripe_payment_method_stripe_pm_id_check
    CHECK (stripe_payment_method_id ~ '^pm_'),
  CONSTRAINT m_stripe_payment_method_stripe_pm_id_unique
    UNIQUE (stripe_payment_method_id)
);

CREATE INDEX IF NOT EXISTS idx_m_stripe_payment_method_user_id
  ON m_stripe_payment_method(user_id);
CREATE INDEX IF NOT EXISTS idx_m_stripe_payment_method_deleted_at
  ON m_stripe_payment_method(deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_m_stripe_payment_method_user_default
  ON m_stripe_payment_method(user_id)
  WHERE is_default = TRUE AND deleted_at IS NULL;

COMMENT ON TABLE m_stripe_payment_method IS 'Stripe 支払い方法（カード）非機密情報マスタ';
COMMENT ON COLUMN m_stripe_payment_method.id IS '主キー (UUID v7)';
COMMENT ON COLUMN m_stripe_payment_method.user_id IS 'ユーザーID (m_user.id への参照)';
COMMENT ON COLUMN m_stripe_payment_method.stripe_payment_method_id IS 'Stripe PaymentMethod ID (pm_xxx)';
COMMENT ON COLUMN m_stripe_payment_method.is_default IS 'デフォルト支払い方法フラグ (1ユーザー1件)';
COMMENT ON COLUMN m_stripe_payment_method.type IS '支払い方法種別 (payment_method_type ENUM)';
COMMENT ON COLUMN m_stripe_payment_method.card_brand IS 'カードブランド (visa/mastercard/jcb など)';
COMMENT ON COLUMN m_stripe_payment_method.card_last4 IS 'カード番号下4桁';
COMMENT ON COLUMN m_stripe_payment_method.card_exp_month IS '有効期限月 (2桁)';
COMMENT ON COLUMN m_stripe_payment_method.card_exp_year IS '有効期限年 (4桁)';
COMMENT ON COLUMN m_stripe_payment_method.card_holder_name IS 'カード名義人';
COMMENT ON COLUMN m_stripe_payment_method.created_at IS 'レコード作成日時';
COMMENT ON COLUMN m_stripe_payment_method.created_by IS '作成者 (ユーザーID または NULL)';
COMMENT ON COLUMN m_stripe_payment_method.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN m_stripe_payment_method.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN m_stripe_payment_method.updated_by IS '最終更新者 (ユーザーID または NULL)';
COMMENT ON COLUMN m_stripe_payment_method.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN m_stripe_payment_method.patched_at IS 'パッチ更新日時 (緊急修正時に使用)';
COMMENT ON COLUMN m_stripe_payment_method.patched_by IS 'パッチ更新者';
COMMENT ON COLUMN m_stripe_payment_method.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN m_stripe_payment_method.deleted_at IS '論理削除日時 (NULL=有効)';

-- =====================================================
-- 4. RLS: m_stripe_payment_method
--    クライアントからは SELECT のみ許可、書き込みは service_role 経由
-- =====================================================

ALTER TABLE m_stripe_payment_method ENABLE ROW LEVEL SECURITY;

CREATE POLICY "m_stripe_payment_method_select_own"
ON m_stripe_payment_method FOR SELECT
USING (
  user_id = get_current_user_id()
  AND deleted_at IS NULL
);

CREATE POLICY "m_stripe_payment_method_select_admin"
ON m_stripe_payment_method FOR SELECT
USING (is_admin());

CREATE POLICY "m_stripe_payment_method_service_role_all"
ON m_stripe_payment_method FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- 5. RPC: upd_m_user_stripe_customer_id
--    Stripe Customer ID を m_user に登録（既に登録済みなら何もしない）
-- =====================================================

CREATE OR REPLACE FUNCTION upd_m_user_stripe_customer_id(
  p_auth_user_id UUID,
  p_stripe_customer_id TEXT,
  p_updated_program TEXT DEFAULT 'create-stripe-customer'
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  stripe_customer_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing TEXT;
BEGIN
  IF p_stripe_customer_id IS NULL OR p_stripe_customer_id !~ '^cus_' THEN
    RAISE EXCEPTION 'invalid stripe_customer_id';
  END IF;

  SELECT mu.stripe_customer_id INTO v_existing
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_existing IS NOT NULL AND v_existing <> '' THEN
    RETURN QUERY
    SELECT mu.id, mu.email, mu.stripe_customer_id
    FROM m_user mu
    WHERE mu.supabase_auth_user_id = p_auth_user_id;
    RETURN;
  END IF;

  UPDATE m_user
  SET
    stripe_customer_id = p_stripe_customer_id,
    updated_at = CURRENT_TIMESTAMP,
    updated_program = p_updated_program,
    lock_no = lock_no + 1
  WHERE supabase_auth_user_id = p_auth_user_id
    AND deleted_at IS NULL;

  RETURN QUERY
  SELECT mu.id, mu.email, mu.stripe_customer_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id;
END;
$$;

COMMENT ON FUNCTION upd_m_user_stripe_customer_id(UUID, TEXT, TEXT)
  IS 'Stripe Customer ID を m_user に紐付ける（重複登録は冪等）';

-- =====================================================
-- 6. RPC: sel_stripe_payment_methods
--    認証ユーザーの支払い方法一覧を取得
-- =====================================================

CREATE OR REPLACE FUNCTION sel_stripe_payment_methods(
  p_auth_user_id UUID
)
RETURNS TABLE(
  id UUID,
  stripe_payment_method_id TEXT,
  is_default BOOLEAN,
  type payment_method_type,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month TEXT,
  card_exp_year TEXT,
  card_holder_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pm.id,
    pm.stripe_payment_method_id,
    pm.is_default,
    pm.type,
    pm.card_brand,
    pm.card_last4,
    pm.card_exp_month,
    pm.card_exp_year,
    pm.card_holder_name
  FROM m_stripe_payment_method pm
  WHERE pm.user_id = v_user_id
    AND pm.deleted_at IS NULL
  ORDER BY pm.is_default DESC, pm.created_at ASC;
END;
$$;

COMMENT ON FUNCTION sel_stripe_payment_methods(UUID)
  IS '認証ユーザーIDから支払い方法一覧を取得（デフォルト優先）';

-- =====================================================
-- 7. RPC: ins_stripe_payment_method
--    支払い方法を新規登録（必要に応じて自動でデフォルトに昇格）
-- =====================================================

CREATE OR REPLACE FUNCTION ins_stripe_payment_method(
  p_auth_user_id UUID,
  p_stripe_payment_method_id TEXT,
  p_card_brand TEXT,
  p_card_last4 TEXT,
  p_card_exp_month TEXT,
  p_card_exp_year TEXT,
  p_card_holder_name TEXT,
  p_set_default BOOLEAN DEFAULT FALSE,
  p_created_program TEXT DEFAULT 'create-payment-method'
)
RETURNS TABLE(
  id UUID,
  stripe_payment_method_id TEXT,
  is_default BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_default_count INT;
  v_should_be_default BOOLEAN;
  v_new_id UUID;
BEGIN
  IF p_stripe_payment_method_id IS NULL OR p_stripe_payment_method_id !~ '^pm_' THEN
    RAISE EXCEPTION 'invalid stripe_payment_method_id';
  END IF;

  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user not found: %', p_auth_user_id;
  END IF;

  SELECT COUNT(*) INTO v_default_count
  FROM m_stripe_payment_method pm
  WHERE pm.user_id = v_user_id
    AND pm.is_default = TRUE
    AND pm.deleted_at IS NULL;

  v_should_be_default := p_set_default OR v_default_count = 0;

  IF v_should_be_default AND v_default_count > 0 THEN
    UPDATE m_stripe_payment_method
    SET
      is_default = FALSE,
      updated_at = CURRENT_TIMESTAMP,
      updated_program = p_created_program,
      lock_no = lock_no + 1
    WHERE user_id = v_user_id
      AND is_default = TRUE
      AND deleted_at IS NULL;
  END IF;

  INSERT INTO m_stripe_payment_method (
    user_id,
    stripe_payment_method_id,
    is_default,
    type,
    card_brand,
    card_last4,
    card_exp_month,
    card_exp_year,
    card_holder_name,
    created_program,
    updated_program,
    lock_no
  ) VALUES (
    v_user_id,
    p_stripe_payment_method_id,
    v_should_be_default,
    'card'::payment_method_type,
    NULLIF(p_card_brand, ''),
    NULLIF(p_card_last4, ''),
    NULLIF(p_card_exp_month, ''),
    NULLIF(p_card_exp_year, ''),
    NULLIF(p_card_holder_name, ''),
    p_created_program,
    p_created_program,
    0
  )
  RETURNING m_stripe_payment_method.id INTO v_new_id;

  RETURN QUERY
  SELECT pm.id, pm.stripe_payment_method_id, pm.is_default
  FROM m_stripe_payment_method pm
  WHERE pm.id = v_new_id;
END;
$$;

COMMENT ON FUNCTION ins_stripe_payment_method(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT)
  IS '認証ユーザーIDから支払い方法を新規登録（既存デフォルトとの整合性も自動調整）';

-- =====================================================
-- 8. RPC: upd_stripe_payment_method
--    支払い方法を更新（名義変更 / デフォルト切り替え）
-- =====================================================

CREATE OR REPLACE FUNCTION upd_stripe_payment_method(
  p_auth_user_id UUID,
  p_stripe_payment_method_id TEXT,
  p_card_holder_name TEXT,
  p_set_default BOOLEAN,
  p_updated_program TEXT DEFAULT 'update-payment-method'
)
RETURNS TABLE(
  id UUID,
  stripe_payment_method_id TEXT,
  is_default BOOLEAN,
  card_holder_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_target_id UUID;
BEGIN
  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user not found: %', p_auth_user_id;
  END IF;

  SELECT pm.id INTO v_target_id
  FROM m_stripe_payment_method pm
  WHERE pm.user_id = v_user_id
    AND pm.stripe_payment_method_id = p_stripe_payment_method_id
    AND pm.deleted_at IS NULL;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'payment method not found';
  END IF;

  IF p_set_default THEN
    UPDATE m_stripe_payment_method
    SET
      is_default = FALSE,
      updated_at = CURRENT_TIMESTAMP,
      updated_program = p_updated_program,
      lock_no = lock_no + 1
    WHERE user_id = v_user_id
      AND id <> v_target_id
      AND is_default = TRUE
      AND deleted_at IS NULL;
  END IF;

  UPDATE m_stripe_payment_method
  SET
    card_holder_name = COALESCE(NULLIF(p_card_holder_name, ''), card_holder_name),
    is_default = CASE WHEN p_set_default THEN TRUE ELSE is_default END,
    updated_at = CURRENT_TIMESTAMP,
    updated_program = p_updated_program,
    lock_no = lock_no + 1
  WHERE id = v_target_id;

  RETURN QUERY
  SELECT pm.id, pm.stripe_payment_method_id, pm.is_default, pm.card_holder_name
  FROM m_stripe_payment_method pm
  WHERE pm.id = v_target_id;
END;
$$;

COMMENT ON FUNCTION upd_stripe_payment_method(UUID, TEXT, TEXT, BOOLEAN, TEXT)
  IS '支払い方法の名義/デフォルトを更新';

-- =====================================================
-- 9. RPC: del_stripe_payment_method
--    支払い方法を論理削除（削除対象がデフォルトなら他の最古を昇格）
--    戻り値: 新しいデフォルトとなった支払い方法の Stripe ID（昇格があった場合のみ）
-- =====================================================

CREATE OR REPLACE FUNCTION del_stripe_payment_method(
  p_auth_user_id UUID,
  p_stripe_payment_method_id TEXT,
  p_updated_program TEXT DEFAULT 'delete-payment-method'
)
RETURNS TABLE(
  deleted_id UUID,
  promoted_default_stripe_payment_method_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_target_id UUID;
  v_target_was_default BOOLEAN;
  v_promote_id UUID;
  v_promote_stripe_id TEXT;
BEGIN
  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user not found: %', p_auth_user_id;
  END IF;

  SELECT pm.id, pm.is_default
    INTO v_target_id, v_target_was_default
  FROM m_stripe_payment_method pm
  WHERE pm.user_id = v_user_id
    AND pm.stripe_payment_method_id = p_stripe_payment_method_id
    AND pm.deleted_at IS NULL;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'payment method not found';
  END IF;

  UPDATE m_stripe_payment_method
  SET
    deleted_at = CURRENT_TIMESTAMP,
    is_default = FALSE,
    updated_at = CURRENT_TIMESTAMP,
    updated_program = p_updated_program,
    lock_no = lock_no + 1
  WHERE id = v_target_id;

  IF v_target_was_default THEN
    SELECT pm.id, pm.stripe_payment_method_id
      INTO v_promote_id, v_promote_stripe_id
    FROM m_stripe_payment_method pm
    WHERE pm.user_id = v_user_id
      AND pm.deleted_at IS NULL
    ORDER BY pm.created_at ASC
    LIMIT 1;

    IF v_promote_id IS NOT NULL THEN
      UPDATE m_stripe_payment_method
      SET
        is_default = TRUE,
        updated_at = CURRENT_TIMESTAMP,
        updated_program = p_updated_program,
        lock_no = lock_no + 1
      WHERE id = v_promote_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT v_target_id, v_promote_stripe_id;
END;
$$;

COMMENT ON FUNCTION del_stripe_payment_method(UUID, TEXT, TEXT)
  IS '支払い方法を論理削除し、デフォルトであれば最古のレコードを自動昇格';
