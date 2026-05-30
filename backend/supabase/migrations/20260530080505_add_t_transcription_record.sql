-- 変換レコード（speech 機能・ローカルデモ用）
-- アクセス: BFF から service_role のみ（speech ではログイン不要）

CREATE TABLE t_transcription_record (
  id UUID PRIMARY KEY DEFAULT generate_uuid_v7(),
  recognized_text TEXT NOT NULL,
  final_text TEXT NOT NULL,
  translation_policy TEXT NOT NULL,
  input_source TEXT NOT NULL,
  detected_language TEXT,
  language_override TEXT,
  amivoice_utterance_id TEXT,
  confidence REAL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_program TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_program TEXT NOT NULL,
  lock_no INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_t_transcription_record_created_at
  ON t_transcription_record (created_at DESC);

COMMENT ON TABLE t_transcription_record IS '音声認識・翻訳結果の変換レコード（speech ローカルデモ）';

COMMENT ON COLUMN t_transcription_record.id IS '変換レコード ID';
COMMENT ON COLUMN t_transcription_record.recognized_text IS 'AmiVoice 認識原文';
COMMENT ON COLUMN t_transcription_record.final_text IS '表示・保存用の最終テキスト';
COMMENT ON COLUMN t_transcription_record.translation_policy IS '翻訳ポリシー（translated / passthrough / manual）';
COMMENT ON COLUMN t_transcription_record.input_source IS '入力ソース（mic / file）';
COMMENT ON COLUMN t_transcription_record.detected_language IS '判定言語（en / ja / unknown 等）';
COMMENT ON COLUMN t_transcription_record.language_override IS 'ユーザー手動指定言語';
COMMENT ON COLUMN t_transcription_record.amivoice_utterance_id IS 'AmiVoice API 返却 utteranceid';
COMMENT ON COLUMN t_transcription_record.confidence IS '認識 confidence';
COMMENT ON COLUMN t_transcription_record.metadata_json IS '拡張メタデータ（JSON）';
COMMENT ON COLUMN t_transcription_record.created_at IS '作成日時';
COMMENT ON COLUMN t_transcription_record.created_program IS '作成プログラム';
COMMENT ON COLUMN t_transcription_record.updated_at IS '更新日時';
COMMENT ON COLUMN t_transcription_record.updated_program IS '更新プログラム';
COMMENT ON COLUMN t_transcription_record.lock_no IS 'ロック番号';
COMMENT ON COLUMN t_transcription_record.deleted_at IS '論理削除日時';

ALTER TABLE t_transcription_record ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE t_transcription_record FROM anon;
REVOKE ALL ON TABLE t_transcription_record FROM authenticated;
