import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/auth_repository.dart';
import 'deep_link_state_provider.dart';

part 'auth_provider.g.dart';

/// 認証状態を監視する Provider。
/// ログイン済みなら Session を返し、未認証なら null を返す。
///
/// Supabase の onAuthStateChange を監視し、
/// ログイン / ログアウト時に自動で状態が更新される。
@Riverpod(keepAlive: true)
class Auth extends _$Auth {
  @override
  Session? build() {
    final repository = ref.watch(authRepositoryProvider);

    final subscription = repository.onAuthStateChange.listen((authState) {
      state = authState.session;
      _handleDeepLinkEvent(authState.event);
    });

    ref.onDispose(subscription.cancel);

    return repository.currentSession;
  }

  void _handleDeepLinkEvent(AuthChangeEvent event) {
    final current = ref.read(deepLinkStateProvider);

    switch (event) {
      case AuthChangeEvent.passwordRecovery:
        ref.read(deepLinkStateProvider.notifier).state =
            DeepLinkState.passwordRecovery;
        break;
      case AuthChangeEvent.userUpdated:
        if (current != DeepLinkState.passwordRecovery) {
          ref.read(deepLinkStateProvider.notifier).state =
              DeepLinkState.emailChangeConfirmed;
        }
        break;
      default:
        break;
    }
  }

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).signOut();
  }
}
