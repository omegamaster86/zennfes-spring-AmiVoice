import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/exceptions.dart';
import '../../../core/supabase_client.dart';

part 'auth_repository.g.dart';

@riverpod
AuthRepository authRepository(AuthRepositoryRef ref) {
  return AuthRepository();
}

class AuthRepository {
  AuthRepository({SupabaseClient? client})
    : _client = client ?? SupabaseClientManager.client;

  final SupabaseClient _client;

  /// Supabase Auth でメールアドレス+パスワードのログインを行う。
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user == null) {
        throw const AppException('ユーザー情報が取得できませんでした');
      }

      if (response.user!.emailConfirmedAt == null) {
        final userEmail = response.user!.email ?? email;
        await _client.auth.signOut();
        throw EmailNotVerifiedException(email: userEmail);
      }
    } on EmailNotVerifiedException {
      rethrow;
    } on AuthException catch (e) {
      throw AppException('ログインに失敗しました: ${e.message}');
    }
  }

  /// Supabase Auth でメールアドレス+パスワードのアカウント作成を行い、
  /// m_user レコードを Edge Function 経由で作成する。
  Future<void> signUp({required String email, required String password}) async {
    try {
      final response = await _client.auth.signUp(
        email: email,
        password: password,
      );

      if (response.user == null) {
        throw const AppException('アカウントの作成に失敗しました');
      }

      await _createUserProfile(authUserId: response.user!.id, email: email);
    } on AppException {
      rethrow;
    } on AuthException catch (e) {
      throw AppException('アカウント作成に失敗しました: ${e.message}');
    }
  }

  /// create-user Edge Function を呼び出して m_user レコードを作成する。
  Future<void> _createUserProfile({
    required String authUserId,
    required String email,
  }) async {
    try {
      final response = await _client.functions.invoke(
        'create-user',
        body: {'authUserId': authUserId, 'email': email},
      );

      if (response.status >= 400) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          throw EdgeFunctionException.fromResponse(data);
        }
        throw EdgeFunctionException(
          'ユーザープロフィールの作成に失敗しました',
          statusCode: response.status,
        );
      }
    } on AppException {
      rethrow;
    } catch (e) {
      throw AppException('ユーザープロフィールの作成に失敗しました: $e');
    }
  }

  /// パスワードリセットメールを送信する。
  Future<void> resetPassword({required String email}) async {
    try {
      await _client.auth.resetPasswordForEmail(
        email,
        redirectTo: 'io.supabase.yourapp://login-callback',
      );
    } on AuthException catch (e) {
      throw AppException('パスワードリセットに失敗しました: ${e.message}');
    }
  }

  /// パスワードを更新する（リカバリーフロー用）。
  Future<void> updatePassword({required String newPassword}) async {
    try {
      await _client.auth.updateUser(UserAttributes(password: newPassword));
    } on AuthException catch (e) {
      throw AppException('パスワードの更新に失敗しました: ${e.message}');
    }
  }

  /// ログアウトする。
  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } on AuthException catch (e) {
      throw AppException('ログアウトに失敗しました: ${e.message}');
    }
  }

  /// 現在のセッションを取得する。未認証なら null。
  Session? get currentSession => _client.auth.currentSession;

  /// 認証状態の変化を監視する Stream。
  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;
}
