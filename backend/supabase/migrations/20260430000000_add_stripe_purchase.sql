-- =====================================================
-- Stripe 1回課金（PaymentIntent）マイグレーション
-- 説明:
--   - m_purchase_item: 購入可能アイテムマスタ（金額の真実値を DB が保持）
--   - t_purchase: 購入履歴トランザクション
--   - 関連 RPC 関数 + RLS
-- =====================================================

-- =====================================================
-- 1. purchase_status ENUM
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
    CREATE TYPE purchase_status AS ENUM (
      'pending',          -- 課金前
      'succeeded',        -- 課金成功
      'failed',           -- 課金失敗
      'requires_action'   -- 3DSなど追加認証要求
    );
  END IF;
END$$;

COMMENT ON TYPE purchase_status IS '購入ステータス (pending/succeeded/failed/requires_action)';

-- =====================================================
-- 2. m_purchase_item: 購入可能アイテムマスタ
--    金額・通貨は DB が真実値を持つ（フロントから受け取った金額は信用しない）
-- =====================================================

CREATE TABLE IF NOT EXISTS m_purchase_item (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  name TEXT NOT NULL,
  description TEXT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'jpy',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
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
  CONSTRAINT m_purchase_item_amount_check CHECK (amount > 0),
  CONSTRAINT m_purchase_item_currency_check CHECK (currency ~ '^[a-z]{3}$')
);

CREATE INDEX IF NOT EXISTS idx_m_purchase_item_is_active
  ON m_purchase_item(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_m_purchase_item_display_order
  ON m_purchase_item(display_order) WHERE deleted_at IS NULL;

COMMENT ON TABLE m_purchase_item IS '購入可能アイテムマスタ（金額・通貨の真実値）';
COMMENT ON COLUMN m_purchase_item.id IS '主キー (UUID v7)';
COMMENT ON COLUMN m_purchase_item.name IS '商品名';
COMMENT ON COLUMN m_purchase_item.description IS '商品説明';
COMMENT ON COLUMN m_purchase_item.amount IS '金額（通貨最小単位、JPY なら円）';
COMMENT ON COLUMN m_purchase_item.currency IS 'ISO 4217 小文字 3 文字（例: jpy）';
COMMENT ON COLUMN m_purchase_item.is_active IS '販売中フラグ';
COMMENT ON COLUMN m_purchase_item.display_order IS '一覧表示順';
COMMENT ON COLUMN m_purchase_item.created_at IS 'レコード作成日時';
COMMENT ON COLUMN m_purchase_item.created_by IS '作成者 (ユーザーID または NULL)';
COMMENT ON COLUMN m_purchase_item.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN m_purchase_item.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN m_purchase_item.updated_by IS '最終更新者 (ユーザーID または NULL)';
COMMENT ON COLUMN m_purchase_item.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN m_purchase_item.patched_at IS 'パッチ更新日時 (緊急修正時に使用)';
COMMENT ON COLUMN m_purchase_item.patched_by IS 'パッチ更新者';
COMMENT ON COLUMN m_purchase_item.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN m_purchase_item.deleted_at IS '論理削除日時 (NULL=有効)';

-- =====================================================
-- 3. RLS: m_purchase_item
--    認証済みユーザーは販売中のアイテムを閲覧可能、書き込みは service_role のみ
-- =====================================================

ALTER TABLE m_purchase_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "m_purchase_item_select_active"
ON m_purchase_item FOR SELECT
TO authenticated
USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY "m_purchase_item_select_admin"
ON m_purchase_item FOR SELECT
USING (is_admin());

CREATE POLICY "m_purchase_item_service_role_all"
ON m_purchase_item FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- 4. t_purchase: 購入履歴トランザクション
-- =====================================================

CREATE TABLE IF NOT EXISTS t_purchase (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  user_id UUID NOT NULL,
  purchase_item_id UUID NULL,
  item_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  stripe_payment_intent_id TEXT NULL,
  stripe_payment_method_id TEXT NULL,
  status purchase_status NOT NULL DEFAULT 'pending',
  failure_reason TEXT NULL,
  succeeded_at TIMESTAMPTZ NULL,
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
  CONSTRAINT t_purchase_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT t_purchase_purchase_item_id_fkey
    FOREIGN KEY (purchase_item_id) REFERENCES m_purchase_item(id) ON DELETE SET NULL,
  CONSTRAINT t_purchase_amount_check CHECK (amount > 0),
  CONSTRAINT t_purchase_currency_check CHECK (currency ~ '^[a-z]{3}$'),
  CONSTRAINT t_purchase_pi_id_check
    CHECK (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id ~ '^pi_'),
  CONSTRAINT t_purchase_pm_id_check
    CHECK (stripe_payment_method_id IS NULL OR stripe_payment_method_id ~ '^pm_')
);

CREATE INDEX IF NOT EXISTS idx_t_purchase_user_id
  ON t_purchase(user_id);
CREATE INDEX IF NOT EXISTS idx_t_purchase_status
  ON t_purchase(status);
CREATE INDEX IF NOT EXISTS idx_t_purchase_payment_intent_id
  ON t_purchase(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_t_purchase_created_at
  ON t_purchase(created_at DESC);

COMMENT ON TABLE t_purchase IS '購入履歴（Stripe PaymentIntent 1 件 = 1 レコード）';
COMMENT ON COLUMN t_purchase.id IS '主キー (UUID v7) — Stripe Idempotency-Key としても使用';
COMMENT ON COLUMN t_purchase.user_id IS 'ユーザーID (m_user.id)';
COMMENT ON COLUMN t_purchase.purchase_item_id IS '購入アイテムID (履歴保全のため SET NULL)';
COMMENT ON COLUMN t_purchase.item_name IS '購入時点のアイテム名スナップショット';
COMMENT ON COLUMN t_purchase.amount IS '実際に課金した金額（通貨最小単位）';
COMMENT ON COLUMN t_purchase.currency IS '通貨コード';
COMMENT ON COLUMN t_purchase.stripe_payment_intent_id IS 'Stripe PaymentIntent ID (pi_xxx)';
COMMENT ON COLUMN t_purchase.stripe_payment_method_id IS '使用した PaymentMethod ID (pm_xxx)';
COMMENT ON COLUMN t_purchase.status IS '購入ステータス';
COMMENT ON COLUMN t_purchase.failure_reason IS '失敗理由（Stripe エラーコード等）';
COMMENT ON COLUMN t_purchase.succeeded_at IS '課金成功日時';
COMMENT ON COLUMN t_purchase.created_at IS 'レコード作成日時';
COMMENT ON COLUMN t_purchase.created_by IS '作成者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_purchase.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_purchase.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN t_purchase.updated_by IS '最終更新者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_purchase.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_purchase.patched_at IS 'パッチ更新日時 (緊急修正時に使用)';
COMMENT ON COLUMN t_purchase.patched_by IS 'パッチ更新者';
COMMENT ON COLUMN t_purchase.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN t_purchase.deleted_at IS '論理削除日時 (NULL=有効)';

-- =====================================================
-- 5. RLS: t_purchase
-- =====================================================

ALTER TABLE t_purchase ENABLE ROW LEVEL SECURITY;

CREATE POLICY "t_purchase_select_own"
ON t_purchase FOR SELECT
USING (
  user_id = get_current_user_id()
  AND deleted_at IS NULL
);

CREATE POLICY "t_purchase_select_admin"
ON t_purchase FOR SELECT
USING (is_admin());

CREATE POLICY "t_purchase_service_role_all"
ON t_purchase FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- 6. RPC: sel_purchase_items
-- =====================================================

CREATE OR REPLACE FUNCTION sel_purchase_items()
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  amount INTEGER,
  currency TEXT,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.description,
    i.amount,
    i.currency,
    i.display_order
  FROM m_purchase_item i
  WHERE i.is_active = TRUE
    AND i.deleted_at IS NULL
  ORDER BY i.display_order ASC, i.created_at ASC;
END;
$$;

COMMENT ON FUNCTION sel_purchase_items()
  IS '販売中の購入アイテム一覧を取得（display_order 昇順）';

-- =====================================================
-- 7. RPC: sel_purchase_item_for_charge
--   購入実行用に商品の金額を取得（is_active と存在確認込み）
-- =====================================================

CREATE OR REPLACE FUNCTION sel_purchase_item_for_charge(
  p_purchase_item_id UUID
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  amount INTEGER,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.amount,
    i.currency
  FROM m_purchase_item i
  WHERE i.id = p_purchase_item_id
    AND i.is_active = TRUE
    AND i.deleted_at IS NULL
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION sel_purchase_item_for_charge(UUID)
  IS '課金実行に必要な購入アイテムの真実値を取得';

-- =====================================================
-- 8. RPC: ins_t_purchase
--   pending 状態で履歴を作成し ID を返す（PaymentIntent 作成前に呼ぶ）
-- =====================================================

CREATE OR REPLACE FUNCTION ins_t_purchase(
  p_auth_user_id UUID,
  p_purchase_item_id UUID,
  p_item_name TEXT,
  p_amount INTEGER,
  p_currency TEXT,
  p_stripe_payment_method_id TEXT,
  p_created_program TEXT DEFAULT 'purchase-confirm'
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  amount INTEGER,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;
  IF p_currency IS NULL OR p_currency !~ '^[a-z]{3}$' THEN
    RAISE EXCEPTION 'invalid currency';
  END IF;
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

  INSERT INTO t_purchase (
    user_id,
    purchase_item_id,
    item_name,
    amount,
    currency,
    stripe_payment_method_id,
    status,
    created_program,
    updated_program,
    lock_no
  ) VALUES (
    v_user_id,
    p_purchase_item_id,
    p_item_name,
    p_amount,
    p_currency,
    p_stripe_payment_method_id,
    'pending'::purchase_status,
    p_created_program,
    p_created_program,
    0
  )
  RETURNING t_purchase.id INTO v_new_id;

  RETURN QUERY
  SELECT t.id, t.user_id, t.amount, t.currency
  FROM t_purchase t
  WHERE t.id = v_new_id;
END;
$$;

COMMENT ON FUNCTION ins_t_purchase(UUID, UUID, TEXT, INTEGER, TEXT, TEXT, TEXT)
  IS 'pending 状態の購入履歴を作成（PaymentIntent 作成前に呼ぶ）';

-- =====================================================
-- 9. RPC: upd_t_purchase_result
--   PaymentIntent の結果を反映（成功/失敗/要追加認証）
-- =====================================================

CREATE OR REPLACE FUNCTION upd_t_purchase_result(
  p_purchase_id UUID,
  p_status TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL,
  p_updated_program TEXT DEFAULT 'purchase-confirm'
)
RETURNS TABLE(
  out_id UUID,
  out_status purchase_status,
  out_stripe_payment_intent_id TEXT,
  out_succeeded_at TIMESTAMPTZ,
  out_failure_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status purchase_status;
BEGIN
  IF p_status NOT IN ('pending', 'succeeded', 'failed', 'requires_action') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;
  v_status := p_status::purchase_status;

  IF p_stripe_payment_intent_id IS NOT NULL
     AND p_stripe_payment_intent_id !~ '^pi_' THEN
    RAISE EXCEPTION 'invalid stripe_payment_intent_id';
  END IF;

  UPDATE t_purchase AS tp
  SET
    status = v_status,
    stripe_payment_intent_id = COALESCE(p_stripe_payment_intent_id, tp.stripe_payment_intent_id),
    failure_reason = CASE WHEN v_status = 'failed' THEN p_failure_reason ELSE tp.failure_reason END,
    succeeded_at = CASE WHEN v_status = 'succeeded' THEN CURRENT_TIMESTAMP ELSE tp.succeeded_at END,
    updated_at = CURRENT_TIMESTAMP,
    updated_program = p_updated_program,
    lock_no = tp.lock_no + 1
  WHERE tp.id = p_purchase_id;

  RETURN QUERY
  SELECT t.id, t.status, t.stripe_payment_intent_id, t.succeeded_at, t.failure_reason
  FROM t_purchase t
  WHERE t.id = p_purchase_id;
END;
$$;

COMMENT ON FUNCTION upd_t_purchase_result(UUID, TEXT, TEXT, TEXT, TEXT)
  IS 'PaymentIntent の結果を購入履歴に反映';

-- =====================================================
-- 10. RPC: sel_purchases_by_user
--   購入履歴一覧（最新順）
-- =====================================================

CREATE OR REPLACE FUNCTION sel_purchases_by_user(
  p_auth_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  item_name TEXT,
  amount INTEGER,
  currency TEXT,
  status purchase_status,
  failure_reason TEXT,
  succeeded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
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
    t.id,
    t.item_name,
    t.amount,
    t.currency,
    t.status,
    t.failure_reason,
    t.succeeded_at,
    t.created_at
  FROM t_purchase t
  WHERE t.user_id = v_user_id
    AND t.deleted_at IS NULL
  ORDER BY t.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
END;
$$;

COMMENT ON FUNCTION sel_purchases_by_user(UUID, INTEGER)
  IS '認証ユーザーの購入履歴を最新順に取得';

-- =====================================================
-- 11. サンプルデータ（開発時に動作確認しやすくするため）
-- =====================================================

INSERT INTO m_purchase_item (name, description, amount, currency, display_order, is_active, created_program, updated_program)
VALUES
  ('スターターパック', 'お試し用の最小プラン', 500, 'jpy', 10, TRUE, 'migration', 'migration'),
  ('スタンダードパック', '通常プラン', 2000, 'jpy', 20, TRUE, 'migration', 'migration'),
  ('プレミアムパック', '上位プラン', 5000, 'jpy', 30, TRUE, 'migration', 'migration')
ON CONFLICT DO NOTHING;
