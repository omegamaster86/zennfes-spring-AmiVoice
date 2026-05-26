import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:your_app/core/notifications/push_notification_service.dart';
import 'package:your_app/config/routes/router.dart';

class App extends ConsumerStatefulWidget {
  const App({super.key});

  @override
  ConsumerState<App> createState() => _AppState();
}

class _AppState extends ConsumerState<App> with WidgetsBindingObserver {
  GoRouter? _router;
  StreamSubscription<String>? _notificationTapSubscription;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    debugPrint('[APP] initState');

    _notificationTapSubscription = PushNotificationService
        .instance
        .onNotificationTapRoute
        .listen((route) {
          _router?.go(route);
          debugPrint('[APP] navigate by notification: $route');
        });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final initialRoute = PushNotificationService.instance
          .consumePendingInitialRoute();
      if (initialRoute != null) {
        _router?.go(initialRoute);
        debugPrint('[APP] navigate by initial notification: $initialRoute');
      }
    });
  }

  @override
  void dispose() {
    _notificationTapSubscription?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    debugPrint('[APP] lifecycle: $state');
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    _router = router;
    debugPrint('[APP] build');

    return MaterialApp.router(
      title: 'Your App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}
