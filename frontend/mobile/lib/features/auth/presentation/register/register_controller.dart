import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/auth_repository.dart';

part 'register_controller.g.dart';

@riverpod
class RegisterController extends _$RegisterController {
  @override
  FutureOr<void> build() {}

  Future<void> signUp({
    required String email,
    required String password,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).signUp(
            email: email,
            password: password,
          ),
    );
  }
}
