import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../../core/enums/todo_priority.dart';

part 'create_todo_request.freezed.dart';
part 'create_todo_request.g.dart';

@freezed
@JsonSerializable(includeIfNull: false)
class CreateTodoRequest with _$CreateTodoRequest {
  const factory CreateTodoRequest({
    required String title,
    String? description,
    @Default(TodoPriority.medium) TodoPriority priority,
    String? dueDate,
  }) = _CreateTodoRequest;

  factory CreateTodoRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateTodoRequestFromJson(json);
}
