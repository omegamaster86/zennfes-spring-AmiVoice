-- =====================================================
-- Fix: upd_t_purchase_result の曖昧参照（42702）解消
-- 説明:
--   既存の upd_t_purchase_result は RETURNS TABLE の OUT パラメータ名と
--   t_purchase の列名が同一だったため、UPDATE SET の右辺で
--   "column reference is ambiguous" (42702) が発生していた。
--
--   - OUT パラメータ名を out_* にリネームして衝突を回避
--   - UPDATE 文側もテーブル別名 tp で完全修飾
--   - 戻り値の JSON キーは tp.* を SELECT し直して同等を維持
--
-- 注意:
--   RETURN 列名が変わるため、PostgREST 経由で
--   出力 JSON のキー名は out_id / out_status / ... に変わる。
--   現状の Edge Function (purchase-confirm) は戻り値を参照していないので影響なし。
-- =====================================================

-- まず古い定義を明示的に DROP（戻り値シグネチャ変更のため CREATE OR REPLACE 不可）
DROP FUNCTION IF EXISTS upd_t_purchase_result(UUID, TEXT, TEXT, TEXT, TEXT);

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
  IS 'PaymentIntent の結果を購入履歴に反映（曖昧参照修正版）';
