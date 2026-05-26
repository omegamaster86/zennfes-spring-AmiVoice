import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/exceptions.dart';
import '../../../core/supabase_client.dart';
import 'models/todo.dart';
import 'models/create_todo_request.dart';

part 'todo_repository.g.dart';

@riverpod
TodoRepository todoRepository(TodoRepositoryRef ref) {
  return TodoRepository();
}

class TodoRepository {
  TodoRepository({SupabaseClient? client})
      : _client = client ?? SupabaseClientManager.client;

  final SupabaseClient _client;

  Future<List<Todo>> fetchTodos() async {
    try {
      final response = await _client.functions.invoke(
        'get-todos',
        method: HttpMethod.get,
      );
      _assertSuccess(response);
      final body = response.data as Map<String, dynamic>;
      final items = body['data'] as List<dynamic>;
      return items
          .map((e) => Todo.fromJson(e as Map<String, dynamic>))
          .toList();
    } on AppException {
      rethrow;
    } catch (e) {
      throw AppException('Todo一覧の取得に失敗しました: $e');
    }
  }

  Future<Todo> fetchTodo(String id) async {
    try {
      final response = await _client.functions.invoke(
        'get-todo',
        method: HttpMethod.get,
        queryParameters: {'id': id},
      );
      _assertSuccess(response);
      final body = response.data as Map<String, dynamic>;
      return Todo.fromJson(body['data'] as Map<String, dynamic>);
    } on AppException {
      rethrow;
    } catch (e) {
      throw AppException('Todoの取得に失敗しました: $e');
    }
  }

  Future<void> createTodo(CreateTodoRequest request) async {
    try {
      final response = await _client.functions.invoke(
        'create-todo',
        body: request.toJson(),
      );
      _assertSuccess(response);
    } on AppException {
      rethrow;
    } catch (e) {
      throw AppException('Todoの作成に失敗しました: $e');
    }
  }

  void _assertSuccess(FunctionResponse response) {
    if (response.status >= 400) {
      final data = response.data;
      if (data is Map<String, dynamic>) {
        throw EdgeFunctionException.fromResponse(data);
      }
      throw EdgeFunctionException(
        'サーバーエラーが発生しました',
        statusCode: response.status,
      );
    }
  }
}
