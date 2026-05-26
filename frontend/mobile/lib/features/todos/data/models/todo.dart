import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../../core/enums/todo_priority.dart';
import '../../../../core/enums/todo_status.dart';

part 'todo.freezed.dart';
part 'todo.g.dart';

@freezed
class Todo with _$Todo {
  const factory Todo({
    required int id,
    required String title,
    String? description,
    required TodoStatus status,
    required TodoPriority priority,
    String? dueDate,
  }) = _Todo;

  factory Todo.fromJson(Map<String, dynamic> json) => _$TodoFromJson(json);
}
