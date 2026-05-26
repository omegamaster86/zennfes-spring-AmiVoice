-- =====================================================
-- Stripe サブスクリプション機能マイグレーション
-- 説明:
--   - m_subscription_plan: サブスクリプションプランマスタ
--   - t_subscription: ユーザーごとのサブスクリプション履歴
--   - t_stripe_webhook_event: Webhook イベント受信ログ（冪等用）
--   - 関連 RPC + RLS
-- =====================================================

-- =====================================================
-- 1. subscription_status ENUM
--   Stripe の subscription.status をそのまま受ける（値を揃えることで Webhook で
--   そのままキャストできるようにする）
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM (
      'incomplete',
      'incomplete_expired',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'trialing',
      'paused'
    );
  END IF;
END$$;

COMMENT ON TYPE subscription_status IS 'Stripe Subscription status と同一値';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_interval') THEN
    CREATE TYPE billing_interval AS ENUM ('month', 'year');
  END IF;
END$$;

COMMENT ON TYPE billing_interval IS '請求間隔 (month/year)';

-- =====================================================
-- 2. m_subscription_plan: サブスクリプションプランマスタ
--   Stripe Price ID と紐付けて、表示順・説明文等をアプリ側で管理
-- =====================================================

CREATE TABLE IF NOT EXISTS m_subscription_plan (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  name TEXT NOT NULL,
  description TEXT NULL,
  stripe_price_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'jpy',
  billing_interval billing_interval NOT NULL DEFAULT 'month',
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
  CONSTRAINT m_subscription_plan_amount_check CHECK (amount > 0),
  CONSTRAINT m_subscription_plan_currency_check CHECK (currency ~ '^[a-z]{3}$'),
  CONSTRAINT m_subscription_plan_stripe_price_id_check
    CHECK (stripe_price_id ~ '^price_'),
  CONSTRAINT m_subscription_plan_stripe_price_id_unique
    UNIQUE (stripe_price_id)
);

CREATE INDEX IF NOT EXISTS idx_m_subscription_plan_is_active
  ON m_subscription_plan(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_m_subscription_plan_display_order
  ON m_subscription_plan(display_order) WHERE deleted_at IS NULL;

COMMENT ON TABLE m_subscription_plan IS 'サブスクリプションプランマスタ（Stripe Price と 1:1）';
COMMENT ON COLUMN m_subscription_plan.id IS '主キー (UUID v7)';
COMMENT ON COLUMN m_subscription_plan.name IS 'プラン名';
COMMENT ON COLUMN m_subscription_plan.description IS 'プラン説明';
COMMENT ON COLUMN m_subscription_plan.stripe_price_id IS 'Stripe Price ID (price_xxx)';
COMMENT ON COLUMN m_subscription_plan.amount IS '金額（通貨最小単位、JPY なら円）';
COMMENT ON COLUMN m_subscription_plan.currency IS 'ISO 4217 小文字 3 文字（例: jpy）';
COMMENT ON COLUMN m_subscription_plan.billing_interval IS '請求間隔 (month/year)';
COMMENT ON COLUMN m_subscription_plan.is_active IS '販売中フラグ';
COMMENT ON COLUMN m_subscription_plan.display_order IS '一覧表示順';
COMMENT ON COLUMN m_subscription_plan.created_at IS 'レコード作成日時';
COMMENT ON COLUMN m_subscription_plan.created_by IS '作成者 (ユーザーID または NULL)';
COMMENT ON COLUMN m_subscription_plan.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN m_subscription_plan.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN m_subscription_plan.updated_by IS '最終更新者 (ユーザーID または NULL)';
COMMENT ON COLUMN m_subscription_plan.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN m_subscription_plan.patched_at IS 'パッチ更新日時 (緊急修正時に使用)';
COMMENT ON COLUMN m_subscription_plan.patched_by IS 'パッチ更新者';
COMMENT ON COLUMN m_subscription_plan.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN m_subscription_plan.deleted_at IS '論理削除日時 (NULL=有効)';

-- =====================================================
-- 3. RLS: m_subscription_plan
-- =====================================================

ALTER TABLE m_subscription_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "m_subscription_plan_select_active"
ON m_subscription_plan FOR SELECT
TO authenticated
USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY "m_subscription_plan_select_admin"
ON m_subscription_plan FOR SELECT
USING (is_admin());

CREATE POLICY "m_subscription_plan_service_role_all"
ON m_subscription_plan FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- 4. t_subscription: ユーザーごとのサブスクリプション履歴
-- =====================================================

CREATE TABLE IF NOT EXISTS t_subscription (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  user_id UUID NOT NULL,
  plan_id UUID NULL,
  stripe_subscription_id TEXT NULL,
  stripe_price_id TEXT NULL,
  status subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ NULL,
  current_period_end TIMESTAMPTZ NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  latest_invoice_id TEXT NULL,
  latest_invoice_status TEXT NULL,
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
  CONSTRAINT t_subscription_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT t_subscription_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES m_subscription_plan(id) ON DELETE SET NULL,
  CONSTRAINT t_subscription_sub_id_check
    CHECK (stripe_subscription_id IS NULL OR stripe_subscription_id ~ '^sub_'),
  CONSTRAINT t_subscription_price_id_check
    CHECK (stripe_price_id IS NULL OR stripe_price_id ~ '^price_')
);

CREATE INDEX IF NOT EXISTS idx_t_subscription_user_id
  ON t_subscription(user_id);
CREATE INDEX IF NOT EXISTS idx_t_subscription_status
  ON t_subscription(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_t_subscription_stripe_id
  ON t_subscription(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
-- 1 ユーザーに対して有効/未確定状態のサブスクは 1 件まで
-- canceled / incomplete_expired / unpaid / paused は対象外（過去履歴として保持）
CREATE UNIQUE INDEX IF NOT EXISTS idx_t_subscription_user_active_unique
  ON t_subscription(user_id)
  WHERE status IN ('active', 'trialing', 'past_due', 'incomplete')
    AND deleted_at IS NULL;

COMMENT ON TABLE t_subscription IS 'ユーザーのサブスクリプション履歴（Stripe Subscription 1 件 = 1 レコード）';
COMMENT ON COLUMN t_subscription.id IS '主キー (UUID v7) - Stripe Idempotency-Key としても使用';
COMMENT ON COLUMN t_subscription.user_id IS 'ユーザーID (m_user.id)';
COMMENT ON COLUMN t_subscription.plan_id IS 'プランID (履歴保全のため SET NULL)';
COMMENT ON COLUMN t_subscription.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN t_subscription.stripe_price_id IS '加入時のスナップショット Price ID';
COMMENT ON COLUMN t_subscription.status IS 'Stripe Subscription status';
COMMENT ON COLUMN t_subscription.current_period_start IS '現請求期間の開始';
COMMENT ON COLUMN t_subscription.current_period_end IS '現請求期間の終了（=次回更新日）';
COMMENT ON COLUMN t_subscription.cancel_at_period_end IS '期末でキャンセル予約済みフラグ';
COMMENT ON COLUMN t_subscription.canceled_at IS 'キャンセル予約 / 終了日時';
COMMENT ON COLUMN t_subscription.started_at IS '加入開始日時';
COMMENT ON COLUMN t_subscription.ended_at IS '完全終了日時';
COMMENT ON COLUMN t_subscription.latest_invoice_id IS '最新インボイス ID (in_xxx)';
COMMENT ON COLUMN t_subscription.latest_invoice_status IS '最新インボイス状態（paid/open/uncollectible/void/draft）';
COMMENT ON COLUMN t_subscription.created_at IS 'レコード作成日時';
COMMENT ON COLUMN t_subscription.created_by IS '作成者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_subscription.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_subscription.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN t_subscription.updated_by IS '最終更新者 (ユーザーID または NULL)';
COMMENT ON COLUMN t_subscription.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_subscription.patched_at IS 'パッチ更新日時 (緊急修正時に使用)';
COMMENT ON COLUMN t_subscription.patched_by IS 'パッチ更新者';
COMMENT ON COLUMN t_subscription.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN t_subscription.deleted_at IS '論理削除日時 (NULL=有効)';

-- =====================================================
-- 5. RLS: t_subscription
-- =====================================================

ALTER TABLE t_subscription ENABLE ROW LEVEL SECURITY;

CREATE POLICY "t_subscription_select_own"
ON t_subscription FOR SELECT
USING (
  user_id = get_current_user_id()
  AND deleted_at IS NULL
);

CREATE POLICY "t_subscription_select_admin"
ON t_subscription FOR SELECT
USING (is_admin());

CREATE POLICY "t_subscription_service_role_all"
ON t_subscription FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- 6. t_stripe_webhook_event: Webhook イベント受信ログ（冪等用）
-- =====================================================

CREATE TABLE IF NOT EXISTS t_stripe_webhook_event (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  stripe_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_program TEXT NOT NULL DEFAULT 'stripe-webhook',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_program TEXT NOT NULL DEFAULT 'stripe-webhook',
  lock_no BIGINT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT t_stripe_webhook_event_event_id_check
    CHECK (stripe_event_id ~ '^evt_'),
  CONSTRAINT t_stripe_webhook_event_event_id_unique
    UNIQUE (stripe_event_id)
);

CREATE INDEX IF NOT EXISTS idx_t_stripe_webhook_event_event_type
  ON t_stripe_webhook_event(event_type);
CREATE INDEX IF NOT EXISTS idx_t_stripe_webhook_event_processed_at
  ON t_stripe_webhook_event(processed_at);
CREATE INDEX IF NOT EXISTS idx_t_stripe_webhook_event_deleted_at
  ON t_stripe_webhook_event(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE t_stripe_webhook_event IS 'Stripe Webhook 受信ログ（冪等処理用）';
COMMENT ON COLUMN t_stripe_webhook_event.id IS '主キー (UUID v7)';
COMMENT ON COLUMN t_stripe_webhook_event.stripe_event_id IS 'Stripe Event ID (evt_xxx) - 重複検知に使用';
COMMENT ON COLUMN t_stripe_webhook_event.event_type IS 'イベントタイプ (例: customer.subscription.updated)';
COMMENT ON COLUMN t_stripe_webhook_event.payload IS '受信したイベントの生 JSON';
COMMENT ON COLUMN t_stripe_webhook_event.processed_at IS '処理完了日時 (NULL なら未処理 or 失敗)';
COMMENT ON COLUMN t_stripe_webhook_event.error_message IS '処理失敗時のエラーメッセージ';
COMMENT ON COLUMN t_stripe_webhook_event.created_at IS 'レコード作成日時';
COMMENT ON COLUMN t_stripe_webhook_event.created_program IS '作成プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_stripe_webhook_event.updated_at IS 'レコード最終更新日時';
COMMENT ON COLUMN t_stripe_webhook_event.updated_program IS '更新プログラム (画面名+メソッド)';
COMMENT ON COLUMN t_stripe_webhook_event.lock_no IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN t_stripe_webhook_event.deleted_at IS '論理削除日時 (NULL=有効)';

ALTER TABLE t_stripe_webhook_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "t_stripe_webhook_event_service_role_all"
ON t_stripe_webhook_event FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- 7. RPC: sel_subscription_plans
-- =====================================================

CREATE OR REPLACE FUNCTION sel_subscription_plans()
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  stripe_price_id TEXT,
  amount INTEGER,
  currency TEXT,
  billing_interval billing_interval,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.stripe_price_id,
    p.amount,
    p.currency,
    p.billing_interval,
    p.display_order
  FROM m_subscription_plan p
  WHERE p.is_active = TRUE
    AND p.deleted_at IS NULL
  ORDER BY p.display_order ASC, p.created_at ASC;
END;
$$;

COMMENT ON FUNCTION sel_subscription_plans()
  IS '販売中のサブスクリプションプラン一覧を取得';

-- =====================================================
-- 8. RPC: sel_subscription_plan_for_charge
--   加入実行用にプランの真実値を取得
-- =====================================================

CREATE OR REPLACE FUNCTION sel_subscription_plan_for_charge(
  p_plan_id UUID
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  stripe_price_id TEXT,
  amount INTEGER,
  currency TEXT,
  billing_interval billing_interval
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.stripe_price_id,
    p.amount,
    p.currency,
    p.billing_interval
  FROM m_subscription_plan p
  WHERE p.id = p_plan_id
    AND p.is_active = TRUE
    AND p.deleted_at IS NULL
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION sel_subscription_plan_for_charge(UUID)
  IS '加入実行に必要なプランの真実値を取得';

-- =====================================================
-- 9. RPC: sel_current_subscription_by_user
--   現在の有効サブスクリプション 1 件を返す
--   active/trialing/past_due/incomplete を「有効」とみなし、最新を 1 件返す
-- =====================================================

CREATE OR REPLACE FUNCTION sel_current_subscription_by_user(
  p_auth_user_id UUID
)
RETURNS TABLE(
  id UUID,
  plan_id UUID,
  plan_name TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status subscription_status,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  canceled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  amount INTEGER,
  currency TEXT,
  billing_interval billing_interval,
  latest_invoice_status TEXT
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
    s.id,
    s.plan_id,
    p.name AS plan_name,
    s.stripe_subscription_id,
    s.stripe_price_id,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.canceled_at,
    s.started_at,
    p.amount,
    p.currency,
    p.billing_interval,
    s.latest_invoice_status
  FROM t_subscription s
  LEFT JOIN m_subscription_plan p ON p.id = s.plan_id
  WHERE s.user_id = v_user_id
    AND s.deleted_at IS NULL
    AND s.status IN ('active', 'trialing', 'past_due', 'incomplete')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION sel_current_subscription_by_user(UUID)
  IS '認証ユーザーの現在の有効サブスクリプション 1 件を取得';

-- =====================================================
-- 10. RPC: ins_t_subscription
--   pending（status='incomplete'）で行作成。Stripe Subscription 作成前に呼ぶ
-- =====================================================

CREATE OR REPLACE FUNCTION ins_t_subscription(
  p_auth_user_id UUID,
  p_plan_id UUID,
  p_stripe_price_id TEXT,
  p_created_program TEXT DEFAULT 'create-subscription'
)
RETURNS TABLE(
  id UUID,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_id UUID;
BEGIN
  IF p_stripe_price_id IS NULL OR p_stripe_price_id !~ '^price_' THEN
    RAISE EXCEPTION 'invalid stripe_price_id';
  END IF;

  SELECT mu.id INTO v_user_id
  FROM m_user mu
  WHERE mu.supabase_auth_user_id = p_auth_user_id
    AND mu.deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user not found: %', p_auth_user_id;
  END IF;

  INSERT INTO t_subscription (
    user_id,
    plan_id,
    stripe_price_id,
    status,
    created_program,
    updated_program,
    lock_no
  ) VALUES (
    v_user_id,
    p_plan_id,
    p_stripe_price_id,
    'incomplete'::subscription_status,
    p_created_program,
    p_created_program,
    0
  )
  RETURNING t_subscription.id INTO v_new_id;

  RETURN QUERY
  SELECT s.id, s.user_id
  FROM t_subscription s
  WHERE s.id = v_new_id;
END;
$$;

COMMENT ON FUNCTION ins_t_subscription(UUID, UUID, TEXT, TEXT)
  IS 'pending 状態でサブスクリプション履歴を作成（Stripe Subscription 作成前に呼ぶ）';

-- =====================================================
-- 11. RPC: upd_t_subscription_from_stripe
--   Stripe Subscription オブジェクトの主要フィールドをまとめて反映
--   Edge Function (create/cancel) と Webhook の両方から呼ぶ
--
--   p_subscription_id: t_subscription.id（指定時はその行を更新）
--   p_stripe_subscription_id: stripe Subscription ID（指定時は ID で照合）
--   どちらか一方を指定する。両方 NULL なら何もしない。
-- =====================================================

CREATE OR REPLACE FUNCTION upd_t_subscription_from_stripe(
  p_subscription_id UUID DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_current_period_start TIMESTAMPTZ DEFAULT NULL,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL,
  p_cancel_at_period_end BOOLEAN DEFAULT NULL,
  p_canceled_at TIMESTAMPTZ DEFAULT NULL,
  p_started_at TIMESTAMPTZ DEFAULT NULL,
  p_ended_at TIMESTAMPTZ DEFAULT NULL,
  p_latest_invoice_id TEXT DEFAULT NULL,
  p_latest_invoice_status TEXT DEFAULT NULL,
  p_updated_program TEXT DEFAULT 'stripe-sync'
)
RETURNS TABLE(
  out_id UUID,
  out_stripe_subscription_id TEXT,
  out_status subscription_status,
  out_cancel_at_period_end BOOLEAN,
  out_current_period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status subscription_status;
  v_target_id UUID;
BEGIN
  IF p_subscription_id IS NULL AND p_stripe_subscription_id IS NULL THEN
    RAISE EXCEPTION 'either p_subscription_id or p_stripe_subscription_id must be set';
  END IF;

  IF p_status IS NOT NULL THEN
    BEGIN
      v_status := p_status::subscription_status;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid status: %', p_status;
    END;
  END IF;

  IF p_subscription_id IS NOT NULL THEN
    v_target_id := p_subscription_id;
  ELSE
    SELECT s.id INTO v_target_id
    FROM t_subscription s
    WHERE s.stripe_subscription_id = p_stripe_subscription_id
    LIMIT 1;
  END IF;

  IF v_target_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE t_subscription AS ts
  SET
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, ts.stripe_subscription_id),
    status = COALESCE(v_status, ts.status),
    current_period_start = COALESCE(p_current_period_start, ts.current_period_start),
    current_period_end = COALESCE(p_current_period_end, ts.current_period_end),
    cancel_at_period_end = COALESCE(p_cancel_at_period_end, ts.cancel_at_period_end),
    canceled_at = COALESCE(p_canceled_at, ts.canceled_at),
    started_at = COALESCE(p_started_at, ts.started_at),
    ended_at = COALESCE(p_ended_at, ts.ended_at),
    latest_invoice_id = COALESCE(p_latest_invoice_id, ts.latest_invoice_id),
    latest_invoice_status = COALESCE(p_latest_invoice_status, ts.latest_invoice_status),
    updated_at = CURRENT_TIMESTAMP,
    updated_program = p_updated_program,
    lock_no = ts.lock_no + 1
  WHERE ts.id = v_target_id;

  RETURN QUERY
  SELECT
    ts.id,
    ts.stripe_subscription_id,
    ts.status,
    ts.cancel_at_period_end,
    ts.current_period_end
  FROM t_subscription ts
  WHERE ts.id = v_target_id;
END;
$$;

COMMENT ON FUNCTION upd_t_subscription_from_stripe(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT)
  IS 'Stripe Subscription オブジェクトの主要列を t_subscription に反映';

-- =====================================================
-- 12. RPC: ins_stripe_webhook_event
--   Webhook イベントを冪等に登録する
--   既登録なら NULL を返す（重複処理スキップの判定に使う）
-- =====================================================

CREATE OR REPLACE FUNCTION ins_stripe_webhook_event(
  p_stripe_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_stripe_event_id IS NULL OR p_stripe_event_id !~ '^evt_' THEN
    RAISE EXCEPTION 'invalid stripe_event_id';
  END IF;

  INSERT INTO t_stripe_webhook_event (
    stripe_event_id,
    event_type,
    payload
  ) VALUES (
    p_stripe_event_id,
    p_event_type,
    p_payload
  )
  ON CONFLICT (stripe_event_id) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION ins_stripe_webhook_event(TEXT, TEXT, JSONB)
  IS 'Webhook イベントを冪等に登録（既存なら NULL 返却）';

-- =====================================================
-- 13. RPC: mark_stripe_webhook_event_processed
--   Webhook 処理結果（成功/失敗）を記録
-- =====================================================

CREATE OR REPLACE FUNCTION mark_stripe_webhook_event_processed(
  p_stripe_event_id TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE t_stripe_webhook_event
  SET
    processed_at = CASE WHEN p_error_message IS NULL THEN CURRENT_TIMESTAMP ELSE processed_at END,
    error_message = p_error_message,
    updated_at = CURRENT_TIMESTAMP
  WHERE stripe_event_id = p_stripe_event_id;
END;
$$;

COMMENT ON FUNCTION mark_stripe_webhook_event_processed(TEXT, TEXT)
  IS 'Webhook イベントの処理結果を記録';

-- =====================================================
-- 14. サンプルデータ
--   stripe_price_id はダミー値。Stripe Dashboard で実 Price を作成後、
--   各環境で UPDATE して実 Price ID に差し替えること:
--
--   UPDATE m_subscription_plan
--   SET stripe_price_id = 'price_実IDに差し替え'
--   WHERE id = '...';
-- =====================================================

INSERT INTO m_subscription_plan (
  name, description, stripe_price_id, amount, currency,
  billing_interval, display_order, is_active, created_program, updated_program
)
VALUES
  (
    'スタンダード月額',
    '基本機能をご利用いただける月額プラン',
    'price_dev_standard_monthly',
    980, 'jpy', 'month', 10, TRUE, 'migration', 'migration'
  ),
  (
    'プレミアム月額',
    'すべての機能をご利用いただける月額プラン',
    'price_dev_premium_monthly',
    2980, 'jpy', 'month', 20, TRUE, 'migration', 'migration'
  )
ON CONFLICT (stripe_price_id) DO NOTHING;
