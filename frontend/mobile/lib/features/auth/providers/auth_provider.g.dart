// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$authHash() => r'e31d2c2bead26af4fdd0df9060de8dc41a70c609';

/// 認証状態を監視する Provider。
/// ログイン済みなら Session を返し、未認証なら null を返す。
///
/// Supabase の onAuthStateChange を監視し、
/// ログイン / ログアウト時に自動で状態が更新される。
///
/// Copied from [Auth].
@ProviderFor(Auth)
final authProvider = NotifierProvider<Auth, Session?>.internal(
  Auth.new,
  name: r'authProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$authHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$Auth = Notifier<Session?>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
