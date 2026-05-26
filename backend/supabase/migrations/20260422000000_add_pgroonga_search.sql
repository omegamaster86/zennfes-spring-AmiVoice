-- =====================================================
-- 全文検索 (pgroonga) 追加
-- 説明: t_todo (title, description) に対する日本語・英語・数字の全文検索機能
--       pgroonga 検索 + LIKE フォールバック + pgroonga_score による関連度ソート
-- =====================================================

-- =====================================================
-- 拡張機能: pgroonga
-- ローカル Supabase / Supabase Cloud どちらでも利用可能
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgroonga;

-- =====================================================
-- pgroonga インデックス: t_todo (title, description)
-- 日本語・英語・数字を高精度に扱うための構成:
--   tokenizer  : TokenMecab
--     - 日本語: MeCab による形態素解析（例: "東京都" → "東京/都"）
--     - 英語  : スペース・記号で単語単位に分割（例: "Next.js" → "Next/js"）
--     - 数字  : 連続した数字をひとつのトークンとして扱う
--   normalizer : NormalizerAuto
--     - 大文字小文字を同一視 ("Hello" = "hello")
--     - 全角・半角を同一視 ("ＡＢＣ" = "ABC", "１２３" = "123")
--     - 濁点・半濁点、カナ等の揺らぎを吸収
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_t_todo_pgroonga
ON t_todo
USING pgroonga (title, description)
WITH (
  tokenizer='TokenMecab',
  normalizer='NormalizerAuto'
);

COMMENT ON INDEX idx_t_todo_pgroonga IS 'pgroonga 全文検索インデックス (title, description) - 日本語・英語・数字を対象';

-- =====================================================
-- RPC 関数: sel_todos_search
-- 説明: 認証ユーザーのToDoをキーワードで全文検索
--       p_search_query が空かつ p_keyword_list が NULL/空 の場合は通常の一覧を返す
--
-- 引数:
--   p_search_query  - Groonga クエリ構文文字列（呼び出し側で特殊文字エスケープ済み・スペース AND 連結済み）
--                     例: '北海道 札幌 "Next js"'
--   p_keyword_list  - LIKE フォールバック用の生キーワード配列
--                     TokenMecab で索き出せない記号や 1 文字英字に対応するため、
--                     全キーワードを AND で部分一致検索する
--   p_limit / p_offset - ページング
--
-- 戻り値:
--   id, title, description, status, priority, relevance_score
--   - relevance_score は pgroonga_score（マッチ度）。LIKE フォールバック側は 0.0
--   - 同一 ToDo が pgroonga と LIKE 両方でヒットした場合は score の高い方を採用
--
-- 認証ユーザー:
--   auth.uid() を内部で参照する get_current_user_id() で m_user.id を解決する
-- =====================================================

DROP FUNCTION IF EXISTS sel_todos_search(UUID, TEXT, INT, INT);
DROP FUNCTION IF EXISTS sel_todos_search(UUID, TEXT, TEXT[], INT, INT);
DROP FUNCTION IF EXISTS sel_todos_search(TEXT, TEXT[], INT, INT);

CREATE OR REPLACE FUNCTION sel_todos_search(
  p_search_query TEXT DEFAULT '',
  p_keyword_list TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  relevance_score REAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_search_query TEXT;
  v_has_keyword_list BOOLEAN;
  v_limit INT;
  v_offset INT;
BEGIN
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);
  v_search_query := COALESCE(TRIM(p_search_query), '');
  v_has_keyword_list :=
    p_keyword_list IS NOT NULL
    AND array_length(p_keyword_list, 1) IS NOT NULL
    AND array_length(p_keyword_list, 1) > 0;

  v_user_id := get_current_user_id();

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  IF v_search_query = '' AND NOT v_has_keyword_list THEN
    RETURN QUERY
    SELECT
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      0.0::real AS relevance_score
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
      t.created_at DESC
    LIMIT v_limit OFFSET v_offset;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    deduped.id,
    deduped.title,
    deduped.description,
    deduped.status,
    deduped.priority,
    deduped.relevance_score
  FROM (
    SELECT DISTINCT ON (combined.id)
      combined.id,
      combined.title,
      combined.description,
      combined.status,
      combined.priority,
      combined.relevance_score,
      combined.created_at
    FROM (
      -- pgroonga 検索（メインクエリ: 日本語形態素解析によるトークンマッチ）
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        pgroonga_score(t.tableoid, t.ctid)::real AS relevance_score,
        t.created_at
      FROM t_todo t
      WHERE
        t.user_id = v_user_id
        AND t.deleted_at IS NULL
        AND v_search_query <> ''
        AND (
          t.title &@~ v_search_query
          OR COALESCE(t.description, '') &@~ v_search_query
        )

      UNION ALL

      -- LIKE フォールバック（記号・短い英字・TokenMecab 非対応文字対応）
      -- すべてのキーワードが title または description に部分一致する ToDo を抽出（AND）
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        0.0::real AS relevance_score,
        t.created_at
      FROM t_todo t
      WHERE
        t.user_id = v_user_id
        AND t.deleted_at IS NULL
        AND v_has_keyword_list
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(p_keyword_list) AS kw
          WHERE NOT (
            t.title LIKE '%' || kw || '%'
            OR COALESCE(t.description, '') LIKE '%' || kw || '%'
          )
        )
    ) AS combined
    ORDER BY combined.id, combined.relevance_score DESC
  ) AS deduped
  ORDER BY deduped.relevance_score DESC, deduped.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION sel_todos_search(TEXT, TEXT[], INT, INT) IS
  '認証ユーザーのToDoを pgroonga で全文検索し、LIKE フォールバックを併用する。'
  '認証ユーザーは get_current_user_id() (auth.uid() ベース) で解決する。'
  'p_search_query は呼び出し側で Groonga 特殊文字をエスケープ済みの AND クエリ、'
  'p_keyword_list は記号・短い英字に対応するための生キーワード配列。'
  '関連度（pgroonga_score）降順、同点は created_at 降順で返す。';
