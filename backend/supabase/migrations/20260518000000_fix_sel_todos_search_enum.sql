-- =====================================================
-- sel_todos_search(TEXT, TEXT[], INT, INT) を enum 型に対応させる
--
-- 背景:
--   20260422 で作成された sel_todos_search(p_search_query TEXT, p_keyword_list TEXT[], p_limit INT, p_offset INT)
--   は status/priority を TEXT として返していた。
--   その後 20260423 で t_todo.status / t_todo.priority が
--   todo_status / todo_priority の enum 型に変換されたが、
--   この関数の RETURNS TABLE は TEXT のまま残っており、
--   PostgreSQL の "structure of query does not match function result type" エラーで
--   500 を返す状態になっていた。
--
-- 修正方針:
--   旧シグネチャの関数を一度 DROP し、RETURNS TABLE の status/priority を
--   enum 型 (todo_status / todo_priority) で再定義する。
--   本体ロジックは 20260422 と同等（pgroonga + LIKE フォールバック AND 検索）。
-- =====================================================

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
  status todo_status,
  priority todo_priority,
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
  'status/priority は enum 型 (todo_status / todo_priority) で返す。'
  '関連度（pgroonga_score）降順、同点は created_at 降順で返す。';
