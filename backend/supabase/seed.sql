-- =====================================================
-- Seed Data
-- 説明: 開発・テスト用の初期データ
-- 注意: 本番環境では実行しないこと
-- =====================================================

-- =====================================================
-- auth.users テーブルへのテストユーザー追加
-- =====================================================
-- 開発環境専用のテストユーザーを作成します
-- 本番環境では必ずSupabase DashboardまたはAuth APIを使用してください
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values 
  (
    '00000000-0000-0000-0000-000000000001', -- id
    '00000000-0000-0000-0000-000000000000', -- instance_id
    'admin@example.com',                     -- email
    crypt('TestPass1@', gen_salt('bf')),    -- encrypted_password
    now(),                                   -- email_confirmed_at
    now(),                                   -- created_at
    now(),                                   -- updated_at
    '{"provider":"email","providers":["email"]}', -- raw_app_meta_data
    '{"name":"管理者ユーザー"}',                   -- raw_user_meta_data
    false,                                   -- is_super_admin
    'authenticated',                         -- role
    'authenticated',                         -- aud
    '',                                      -- confirmation_token
    '',                                      -- recovery_token
    '',                                      -- email_change_token_new
    ''                                       -- email_change
  ),
  (
    '00000000-0000-0000-0000-000000000002', -- id
    '00000000-0000-0000-0000-000000000000', -- instance_id
    'guest1@example.com',                    -- email
    crypt('TestPass1@', gen_salt('bf')),    -- encrypted_password
    now(),                                   -- email_confirmed_at
    now(),                                   -- created_at
    now(),                                   -- updated_at
    '{"provider":"email","providers":["email"]}', -- raw_app_meta_data
    '{"name":"一般ユーザー1"}',                    -- raw_user_meta_data
    false,                                   -- is_super_admin
    'authenticated',                         -- role
    'authenticated',                         -- aud
    '',                                      -- confirmation_token
    '',                                      -- recovery_token
    '',                                      -- email_change_token_new
    ''                                       -- email_change
  ),
  (
    '00000000-0000-0000-0000-000000000003', -- id
    '00000000-0000-0000-0000-000000000000', -- instance_id
    'guest2@example.com',                    -- email
    crypt('TestPass1@', gen_salt('bf')),    -- encrypted_password
    now(),                                   -- email_confirmed_at
    now(),                                   -- created_at
    now(),                                   -- updated_at
    '{"provider":"email","providers":["email"]}', -- raw_app_meta_data
    '{"name":"ゲストユーザー2"}',                   -- raw_user_meta_data
    false,                                   -- is_super_admin
    'authenticated',                         -- role
    'authenticated',                         -- aud
    '',                                      -- confirmation_token
    '',                                      -- recovery_token
    '',                                      -- email_change_token_new
    ''                                       -- email_change
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 認証アイデンティティ (auth.identities)
-- =====================================================
-- auth.users に対応する identities レコードを作成
-- Supabase Auth の正常な動作に必要
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object(
    'sub', u.id,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  u.id,
  NOW(),
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities WHERE user_id = u.id AND provider = 'email'
);

-- =====================================================
-- m_user テーブルへのテストデータ追加
-- =====================================================
INSERT INTO public.m_user (
  supabase_auth_user_id,
  email,
  role,
  created_program,
  updated_program
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  'admin',
  'seed.sql',
  'seed.sql'
) ON CONFLICT (supabase_auth_user_id) DO NOTHING;

INSERT INTO public.m_user (
  supabase_auth_user_id,
  email,
  role,
  created_program,
  updated_program
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'guest1@example.com',
  'guest',
  'seed.sql',
  'seed.sql'
) ON CONFLICT (supabase_auth_user_id) DO NOTHING;

INSERT INTO public.m_user (
  supabase_auth_user_id,
  email,
  role,
  created_program,
  updated_program
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'guest2@example.com',
  'guest',
  'seed.sql',
  'seed.sql'
) ON CONFLICT (supabase_auth_user_id) DO NOTHING;

-- =====================================================
-- t_todo テーブルへのテストデータ追加
-- =====================================================

-- 管理者ユーザー（admin@example.com）のToDo
INSERT INTO public.t_todo (
  user_id,
  title,
  description,
  status,
  priority,
  due_date,
  created_program,
  updated_program,
  lock_no
) VALUES 
  -- 高優先度のToDo
  (
    (SELECT id FROM public.m_user WHERE email = 'admin@example.com'),
    '緊急：本番環境のセキュリティパッチ適用',
    'CVE-2024-XXXX の対応が必要。本番環境への適用を最優先で実施すること。',
    'in_progress',
    'high',
    NOW() + INTERVAL '1 day',
    'seed.sql',
    'seed.sql',
    0
  ),
  (
    (SELECT id FROM public.m_user WHERE email = 'admin@example.com'),
    '四半期レビュー資料の作成',
    'Q4の振り返りと次期計画の資料作成。プロジェクトの進捗状況をまとめる。',
    'pending',
    'high',
    NOW() + INTERVAL '3 days',
    'seed.sql',
    'seed.sql',
    0
  ),
  -- 中優先度のToDo
  (
    (SELECT id FROM public.m_user WHERE email = 'admin@example.com'),
    'CI/CDパイプラインの最適化',
    'ビルド時間を短縮するため、キャッシュ戦略の見直しとDockerイメージの最適化を実施。',
    'pending',
    'medium',
    NOW() + INTERVAL '7 days',
    'seed.sql',
    'seed.sql',
    0
  ),
  (
    (SELECT id FROM public.m_user WHERE email = 'admin@example.com'),
    '新入社員向けオンボーディング資料の更新',
    '最新の開発環境構築手順に合わせて、ドキュメントを更新する。',
    'completed',
    'medium',
    NOW() - INTERVAL '2 days',
    'seed.sql',
    'seed.sql',
    1
  ),
  -- 低優先度のToDo
  (
    (SELECT id FROM public.m_user WHERE email = 'admin@example.com'),
    'ログ監視ダッシュボードのUI改善',
    'より見やすいグラフと、フィルター機能の追加を検討。',
    'pending',
    'low',
    NOW() + INTERVAL '14 days',
    'seed.sql',
    'seed.sql',
    0
  );

-- 一般ユーザー1（guest1@example.com）のToDo
INSERT INTO public.t_todo (
  user_id,
  title,
  description,
  status,
  priority,
  due_date,
  created_program,
  updated_program,
  lock_no
) VALUES 
  -- 高優先度のToDo
  (
    (SELECT id FROM public.m_user WHERE email = 'guest1@example.com'),
    'ログイン機能のバグ修正',
    'エラーハンドリングが不十分で、特定の条件下でクラッシュする問題を修正。',
    'in_progress',
    'high',
    NOW() + INTERVAL '2 days',
    'seed.sql',
    'seed.sql',
    0
  ),
  -- 中優先度のToDo
  (
    (SELECT id FROM public.m_user WHERE email = 'guest1@example.com'),
    'ユーザープロフィール編集機能の実装',
    'プロフィール画像のアップロードと基本情報の編集機能を追加。',
    'pending',
    'medium',
    NOW() + INTERVAL '5 days',
    'seed.sql',
    'seed.sql',
    0
  ),
  (
    (SELECT id FROM public.m_user WHERE email = 'guest1@example.com'),
    'APIドキュメントの更新',
    'OpenAPI仕様書を最新のエンドポイントに合わせて更新する。',
    'pending',
    'medium',
    NOW() + INTERVAL '7 days',
    'seed.sql',
    'seed.sql',
    0
  ),
  (
    (SELECT id FROM public.m_user WHERE email = 'guest1@example.com'),
    'レスポンシブデザインの調整',
    'モバイル画面でのレイアウト崩れを修正済み。',
    'completed',
    'medium',
    NOW() - INTERVAL '1 day',
    'seed.sql',
    'seed.sql',
    1
  ),
  -- 低優先度のToDo
  (
    (SELECT id FROM public.m_user WHERE email = 'guest1@example.com'),
    'コードリファクタリング',
    '重複コードの削除と、より読みやすいコード構造への改善。',
    'pending',
    'low',
    NOW() + INTERVAL '10 days',
    'seed.sql',
    'seed.sql',
    0
  ),
  (
    (SELECT id FROM public.m_user WHERE email = 'guest1@example.com'),
    'TypeScriptの厳格モード対応',
    'strictモードを有効にして、型安全性を向上させる。',
    'pending',
    'low',
    NULL,
    'seed.sql',
    'seed.sql',
    0
  );

-- ゲストユーザー2（guest2@example.com）のToDo
INSERT INTO public.t_todo (
  user_id,
  title,
  description,
  status,
  priority,
  due_date,
  created_program,
  updated_program,
  lock_no
) VALUES 
  -- 高優先度のToDo
  (
    (SELECT id FROM public.m_user WHERE email = 'guest2@example.com'),
    'パフォーマンス問題の調査',
    'ダッシュボードの読み込みが遅い原因を特定し、改善策を提案。',
    'in_progress',
    'high',
    NOW() + INTERVAL '2 days',
    'seed.sql',
    'seed.sql',
    0
  ),
  -- 中優先度のToDo
  (
    (SELECT id FROM public.m_user WHERE email = 'guest2@example.com'),
    'ユニットテストのカバレッジ向上',
    '現在50%のカバレッジを80%まで引き上げる。',
    'pending',
    'medium',
    NOW() + INTERVAL '6 days',
    'seed.sql',
    'seed.sql',
    0
  ),
  (
    (SELECT id FROM public.m_user WHERE email = 'guest2@example.com'),
    'データベースのマイグレーション作成',
    '新しいカラムの追加と既存データの移行スクリプトを作成。',
    'completed',
    'medium',
    NOW() - INTERVAL '3 days',
    'seed.sql',
    'seed.sql',
    1
  ),
  -- 低優先度のToDo
  (
    (SELECT id FROM public.m_user WHERE email = 'guest2@example.com'),
    'ESLintルールの見直し',
    'プロジェクトに合わせたカスタムルールの追加を検討。',
    'pending',
    'low',
    NOW() + INTERVAL '15 days',
    'seed.sql',
    'seed.sql',
    0
  ),
  (
    (SELECT id FROM public.m_user WHERE email = 'guest2@example.com'),
    '技術ブログ記事の執筆',
    '最近実装した機能についてのナレッジシェア記事を執筆。',
    'pending',
    'low',
    NULL,
    'seed.sql',
    'seed.sql',
    0
  );

-- completed_at の更新（完了済みToDoに対して）
UPDATE public.t_todo 
SET completed_at = updated_at 
WHERE status = 'completed';
