import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/auth_repository.dart';

part 'password_reset_controller.g.dart';

@riverpod
class PasswordResetController extends _$PasswordResetController {
  @override
  FutureOr<void> build() {}

  Future<void> resetPassword({required String email}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).resetPassword(email: email),
    );
  }
}
