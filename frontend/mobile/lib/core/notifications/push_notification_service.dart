import 'dart:async';
import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const String _defaultChannelId = 'default_notifications';
const String _defaultChannelName = 'Default Notifications';
const String _defaultChannelDescription =
    'App default push notification channel';
const Set<String> _allowedNotificationRoutes = {'/todos', '/settings'};

const AndroidNotificationChannel _defaultChannel = AndroidNotificationChannel(
  _defaultChannelId,
  _defaultChannelName,
  description: _defaultChannelDescription,
  importance: Importance.high,
);

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('[FCM] background message id=${message.messageId}');
}

class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final StreamController<String> _notificationTapRouteController =
      StreamController<String>.broadcast();

  bool _initialized = false;
  String? _pendingInitialRoute;

  Stream<String> get onNotificationTapRoute =>
      _notificationTapRouteController.stream;

  String? consumePendingInitialRoute() {
    final route = _pendingInitialRoute;
    _pendingInitialRoute = null;
    return route;
  }

  Future<void> initialize() async {
    if (_initialized) return;

    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    await FirebaseMessaging.instance.setAutoInitEnabled(true);
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload == null || payload.isEmpty) return;
        final route = _extractRouteFromPayload(payload);
        if (route == null) return;
        _notificationTapRouteController.add(route);
      },
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >()
        ?.requestPermissions(alert: true, badge: true, sound: true);

    if (defaultTargetPlatform == TargetPlatform.android) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(_defaultChannel);
    }

    FirebaseMessaging.onMessage.listen(_showForegroundNotification);
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      debugPrint('[FCM] onMessageOpenedApp id=${message.messageId}');
      _handleNotificationTap(message);
    });

    final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMessage != null) {
      debugPrint('[FCM] getInitialMessage id=${initialMessage.messageId}');
      _pendingInitialRoute = _extractRouteFromMessage(initialMessage);
    }

    final token = await FirebaseMessaging.instance.getToken();
    debugPrint('[FCM] token=$token');
    await _syncTokenToBackend(token);

    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
      debugPrint('[FCM] token refreshed');
      await _syncTokenToBackend(newToken);
    });

    Supabase.instance.client.auth.onAuthStateChange.listen((event) async {
      if (event.event != AuthChangeEvent.signedIn) return;
      final refreshedToken = await FirebaseMessaging.instance.getToken();
      await _syncTokenToBackend(refreshedToken);
    });

    _initialized = true;
  }

  void _handleNotificationTap(RemoteMessage message) {
    final route = _extractRouteFromMessage(message);
    if (route == null) return;
    _notificationTapRouteController.add(route);
  }

  String? _extractRouteFromMessage(RemoteMessage message) {
    final route = _normalizeAllowedRoute(message.data['route']?.toString());
    if (route != null) {
      return route;
    }

    final todoId = message.data['todoId']?.toString();
    if (todoId != null && RegExp(r'^\d+$').hasMatch(todoId)) {
      return '/todos/$todoId';
    }

    return null;
  }

  Future<void> _syncTokenToBackend(String? token) async {
    if (token == null || token.isEmpty) return;

    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      debugPrint('[FCM] skip token sync: unauthenticated');
      return;
    }

    final response = await Supabase.instance.client.functions.invoke(
      'set-fcm-token',
      body: {
        'fcmToken': token,
        'platform': _currentPlatformForPush(),
      },
    );

    if (response.status >= 400) {
      debugPrint('[FCM] token sync failed status=${response.status}');
      return;
    }

    debugPrint('[FCM] token synced');
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await _localNotifications.show(
      notification.hashCode,
      notification.title ?? 'Notification',
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          _defaultChannelId,
          _defaultChannelName,
          channelDescription: _defaultChannelDescription,
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: jsonEncode(message.data),
    );
  }

  String? _extractRouteFromPayload(String payload) {
    try {
      final decoded = jsonDecode(payload);
      if (decoded is! Map<String, dynamic>) return null;
      final route = _normalizeAllowedRoute(decoded['route']?.toString());
      if (route != null) {
        return route;
      }
      final todoId = decoded['todoId']?.toString();
      if (todoId != null && RegExp(r'^\d+$').hasMatch(todoId)) {
        return '/todos/$todoId';
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  String? _normalizeAllowedRoute(String? rawRoute) {
    if (rawRoute == null || rawRoute.isEmpty) return null;
    final route = rawRoute.startsWith('/') ? rawRoute : '/$rawRoute';
    if (_allowedNotificationRoutes.contains(route)) {
      return route;
    }
    if (RegExp(r'^/todos/\d+$').hasMatch(route)) {
      return route;
    }
    return null;
  }

  String _currentPlatformForPush() {
    if (defaultTargetPlatform == TargetPlatform.iOS) return 'ios';
    return 'android';
  }
}
