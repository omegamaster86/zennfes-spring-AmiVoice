import 'package:app_links/app_links.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/notifications/push_notification_service.dart';
import 'core/supabase_client.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final initialUri = await AppLinks().getInitialLink();
  final hasDeepLink =
      initialUri != null &&
      initialUri.scheme == 'io.supabase.yourapp' &&
      initialUri.host == 'login-callback';

  await SupabaseClientManager.initialize();

  if (!kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS)) {
    await Firebase.initializeApp();
    await PushNotificationService.instance.initialize();
  }

  if (hasDeepLink && Supabase.instance.client.auth.currentSession == null) {
    await Supabase.instance.client.auth.onAuthStateChange.first.timeout(
      const Duration(seconds: 5),
      onTimeout: () => AuthState(AuthChangeEvent.initialSession, null),
    );
  }

  runApp(const ProviderScope(child: App()));
}
