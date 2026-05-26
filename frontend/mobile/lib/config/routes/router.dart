import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:your_app/core/widgets/loading_screen.dart';
import 'package:your_app/core/widgets/main_shell.dart';
import 'package:your_app/features/auth/presentation/email_change_confirmed/email_change_confirmed_screen.dart';
import 'package:your_app/features/auth/presentation/email_verification/email_verification_screen.dart';
import 'package:your_app/features/auth/presentation/login/login_screen.dart';
import 'package:your_app/features/auth/presentation/password_reset/password_reset_screen.dart';
import 'package:your_app/features/auth/presentation/register/register_screen.dart';
import 'package:your_app/features/auth/presentation/set_new_password/set_new_password_screen.dart';
import 'package:your_app/features/auth/providers/auth_provider.dart';
import 'package:your_app/features/auth/providers/deep_link_state_provider.dart';
import 'package:your_app/features/settings/presentation/settings_screen.dart';
import 'package:your_app/features/todos/presentation/todo_list_screen.dart';
import 'package:your_app/features/todos/presentation/todo_detail_screen.dart';
import 'package:your_app/features/todos/presentation/add_todo_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _RouterNotifier(ref);
  ref.onDispose(notifier.dispose);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/todos',
    refreshListenable: notifier,
    redirect: (context, state) {
      final session = ref.read(authProvider);
      final deepLinkState = ref.read(deepLinkStateProvider);
      final isLoggedIn = session != null;
      final location = state.matchedLocation;

      debugPrint('[ROUTER] redirect: location=$location, isLoggedIn=$isLoggedIn, deepLink=$deepLinkState');

      if (deepLinkState == DeepLinkState.passwordRecovery && isLoggedIn) {
        if (location != '/reset-password') return '/reset-password';
        return null;
      }

      if (deepLinkState == DeepLinkState.emailChangeConfirmed && isLoggedIn) {
        if (location != '/email-change-confirmed') {
          return '/email-change-confirmed';
        }
        return null;
      }

      final isAuthPage = location == '/login' ||
          location == '/register' ||
          location == '/password-reset' ||
          location == '/email-verification';
      final isLoadingPage = location == '/';

      if (isLoggedIn) {
        if (isAuthPage || isLoadingPage) return '/todos';
        return null;
      }

      if (isLoadingPage) return null;

      if (!isAuthPage) return '/login';
      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const LoadingScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/password-reset',
        builder: (context, state) => const PasswordResetScreen(),
      ),
      GoRoute(
        path: '/email-verification',
        builder: (context, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return EmailVerificationScreen(email: email);
        },
      ),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) => const SetNewPasswordScreen(),
      ),
      GoRoute(
        path: '/email-change-confirmed',
        builder: (context, state) => const EmailChangeConfirmedScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/todos',
                builder: (context, state) => const TodoListScreen(),
                routes: [
                  GoRoute(
                    path: 'add',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => const AddTodoScreen(),
                  ),
                  GoRoute(
                    path: ':todoId',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) {
                      final todoId = state.pathParameters['todoId']!;
                      return TodoDetailScreen(todoId: todoId);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                builder: (context, state) => const SettingsScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

class _RouterNotifier extends ChangeNotifier {
  _RouterNotifier(this._ref) {
    _subscriptions = [
      _ref.listen(authProvider, (prev, next) => notifyListeners()),
      _ref.listen(deepLinkStateProvider, (prev, next) => notifyListeners()),
    ];
  }

  final Ref _ref;
  late final List<ProviderSubscription<dynamic>> _subscriptions;

  @override
  void dispose() {
    for (final sub in _subscriptions) {
      sub.close();
    }
    super.dispose();
  }
}
