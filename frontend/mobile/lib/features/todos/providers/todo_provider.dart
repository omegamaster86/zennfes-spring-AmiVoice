import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../data/models/todo.dart';
import '../data/models/create_todo_request.dart';
import '../data/todo_repository.dart';

part 'todo_provider.g.dart';

// ---------------------------------------------------------------------------
// Todo一覧
// ---------------------------------------------------------------------------

/// Todo一覧の取得・更新を管理する。
/// ref.watch(todoListProvider) で `AsyncValue<List<Todo>>` として監視できる。
///
/// 再取得: ref.invalidate(todoListProvider)
@riverpod
class TodoList extends _$TodoList {
  TodoRepository get _repository => ref.watch(todoRepositoryProvider);

  @override
  Future<List<Todo>> build() {
    return _repository.fetchTodos();
  }

  /// Todo を作成した後、一覧を再取得して最新状態に更新する。
  Future<void> createTodo(CreateTodoRequest request) async {
    await _repository.createTodo(request);
    ref.invalidateSelf();
  }
}

// ---------------------------------------------------------------------------
// Todo詳細
// ---------------------------------------------------------------------------

/// 単一 Todo の取得を管理する。
/// ref.watch(todoDetailProvider(todoId)) で `AsyncValue<Todo>` として監視できる。
///
/// 再取得: ref.invalidate(todoDetailProvider(todoId))
@riverpod
Future<Todo> todoDetail(TodoDetailRef ref, String todoId) {
  return ref.watch(todoRepositoryProvider).fetchTodo(todoId);
}
