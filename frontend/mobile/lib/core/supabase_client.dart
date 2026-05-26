import 'package:supabase_flutter/supabase_flutter.dart';

import 'constants.dart';

class SupabaseClientManager {
  SupabaseClientManager._();

  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: AppConstants.supabaseUrl,
      anonKey: AppConstants.supabaseAnonKey,
    );
  }
}
