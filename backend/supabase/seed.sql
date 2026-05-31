-- =====================================================
-- Seed Data（speech デモ用）
-- t_transcription_record のサンプルのみ
-- 注意: 本番環境では実行しないこと
-- =====================================================

INSERT INTO public.t_transcription_record (
  recognized_text,
  final_text,
  translation_policy,
  input_source,
  detected_language,
  language_override,
  amivoice_utterance_id,
  confidence,
  metadata_json,
  created_program,
  updated_program
) VALUES
  (
    'Hello, this is a sample recording.',
    'こんにちは、これはサンプル録音です。',
    'translated',
    'file',
    'en',
    NULL,
    'seed-sample-001',
    0.92,
    '{"seed": true, "note": "英語→日本語翻訳のサンプル"}'::jsonb,
    'seed.sql',
    'seed.sql'
  ),
  (
    'おはようございます。本日は晴天です。',
    'おはようございます。本日は晴天です。',
    'passthrough',
    'mic',
    'ja',
    NULL,
    'seed-sample-002',
    0.88,
    '{"seed": true, "note": "日本語パススルーのサンプル"}'::jsonb,
    'seed.sql',
    'seed.sql'
  ),
  (
    'Good morning everyone.',
    '皆さん、おはようございます。',
    'manual',
    'file',
    'unknown',
    'en',
    'seed-sample-003',
    0.75,
    '{"seed": true, "note": "手動言語指定のサンプル"}'::jsonb,
    'seed.sql',
    'seed.sql'
  );
