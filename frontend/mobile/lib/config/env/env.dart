// =============================================================================
// ⚠️ 環境変数設定 - 実行時に適切な値を指定してください
// =============================================================================
// 使用方法:
// ```
// flutter run \
//   --dart-define=SUPABASE_URL=https://your-project.supabase.co \
//   --dart-define=SUPABASE_PUBLISHABLE_KEY=your-publishable-key \
//   --dart-define=ENVIRONMENT=development
// ```
// =============================================================================

/// 環境変数の設定
class Env {
  Env._();

  /// Supabase URL
  /// TODO: 実行時に --dart-define=SUPABASE_URL=xxx で指定
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );

  /// Supabase Publishable Key
  /// TODO: 実行時に --dart-define=SUPABASE_PUBLISHABLE_KEY=xxx で指定
  static const String supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: '',
  );

  /// 環境（development, staging, production）
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );

  /// デバッグモードかどうか
  static bool get isDebug => environment == 'development';

  /// ステージングモードかどうか
  static bool get isStaging => environment == 'staging';

  /// プロダクションモードかどうか
  static bool get isProduction => environment == 'production';

  /// 環境変数が正しく設定されているかチェック
  static bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabasePublishableKey.isNotEmpty;
}
