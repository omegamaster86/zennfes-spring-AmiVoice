import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/auth_repository.dart';
import '../../providers/deep_link_state_provider.dart';

part 'set_new_password_controller.g.dart';

@riverpod
class SetNewPasswordController extends _$SetNewPasswordController {
  @override
  FutureOr<void> build() {}

  Future<void> updatePassword({required String newPassword}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(authRepositoryProvider).updatePassword(
            newPassword: newPassword,
          );
      ref.read(deepLinkStateProvider.notifier).state = null;
      await ref.read(authRepositoryProvider).signOut();
    });
  }
}
