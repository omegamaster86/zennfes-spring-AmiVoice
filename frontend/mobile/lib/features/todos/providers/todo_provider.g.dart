// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'todo_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$todoDetailHash() => r'df0b98dcc4849d59c9725bd167880b8a08f5a5e4';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

/// 単一 Todo の取得を管理する。
/// ref.watch(todoDetailProvider(todoId)) で AsyncValue<Todo> として監視できる。
///
/// 再取得: ref.invalidate(todoDetailProvider(todoId))
///
/// Copied from [todoDetail].
@ProviderFor(todoDetail)
const todoDetailProvider = TodoDetailFamily();

/// 単一 Todo の取得を管理する。
/// ref.watch(todoDetailProvider(todoId)) で AsyncValue<Todo> として監視できる。
///
/// 再取得: ref.invalidate(todoDetailProvider(todoId))
///
/// Copied from [todoDetail].
class TodoDetailFamily extends Family<AsyncValue<Todo>> {
  /// 単一 Todo の取得を管理する。
  /// ref.watch(todoDetailProvider(todoId)) で AsyncValue<Todo> として監視できる。
  ///
  /// 再取得: ref.invalidate(todoDetailProvider(todoId))
  ///
  /// Copied from [todoDetail].
  const TodoDetailFamily();

  /// 単一 Todo の取得を管理する。
  /// ref.watch(todoDetailProvider(todoId)) で AsyncValue<Todo> として監視できる。
  ///
  /// 再取得: ref.invalidate(todoDetailProvider(todoId))
  ///
  /// Copied from [todoDetail].
  TodoDetailProvider call(String todoId) {
    return TodoDetailProvider(todoId);
  }

  @override
  TodoDetailProvider getProviderOverride(
    covariant TodoDetailProvider provider,
  ) {
    return call(provider.todoId);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'todoDetailProvider';
}

/// 単一 Todo の取得を管理する。
/// ref.watch(todoDetailProvider(todoId)) で AsyncValue<Todo> として監視できる。
///
/// 再取得: ref.invalidate(todoDetailProvider(todoId))
///
/// Copied from [todoDetail].
class TodoDetailProvider extends AutoDisposeFutureProvider<Todo> {
  /// 単一 Todo の取得を管理する。
  /// ref.watch(todoDetailProvider(todoId)) で AsyncValue<Todo> として監視できる。
  ///
  /// 再取得: ref.invalidate(todoDetailProvider(todoId))
  ///
  /// Copied from [todoDetail].
  TodoDetailProvider(String todoId)
    : this._internal(
        (ref) => todoDetail(ref as TodoDetailRef, todoId),
        from: todoDetailProvider,
        name: r'todoDetailProvider',
        debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
            ? null
            : _$todoDetailHash,
        dependencies: TodoDetailFamily._dependencies,
        allTransitiveDependencies: TodoDetailFamily._allTransitiveDependencies,
        todoId: todoId,
      );

  TodoDetailProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.todoId,
  }) : super.internal();

  final String todoId;

  @override
  Override overrideWith(
    FutureOr<Todo> Function(TodoDetailRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TodoDetailProvider._internal(
        (ref) => create(ref as TodoDetailRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        todoId: todoId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<Todo> createElement() {
    return _TodoDetailProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TodoDetailProvider && other.todoId == todoId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, todoId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin TodoDetailRef on AutoDisposeFutureProviderRef<Todo> {
  /// The parameter `todoId` of this provider.
  String get todoId;
}

class _TodoDetailProviderElement extends AutoDisposeFutureProviderElement<Todo>
    with TodoDetailRef {
  _TodoDetailProviderElement(super.provider);

  @override
  String get todoId => (origin as TodoDetailProvider).todoId;
}

String _$todoListHash() => r'd315c24d62327eaf01bcf696608d1fdca257d215';

/// Todo一覧の取得・更新を管理する。
/// ref.watch(todoListProvider) で AsyncValue<List<Todo>> として監視できる。
///
/// 再取得: ref.invalidate(todoListProvider)
///
/// Copied from [TodoList].
@ProviderFor(TodoList)
final todoListProvider =
    AutoDisposeAsyncNotifierProvider<TodoList, List<Todo>>.internal(
      TodoList.new,
      name: r'todoListProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$todoListHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

typedef _$TodoList = AutoDisposeAsyncNotifier<List<Todo>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
