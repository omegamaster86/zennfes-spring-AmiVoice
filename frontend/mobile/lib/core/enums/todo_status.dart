import 'package:json_annotation/json_annotation.dart';

@JsonEnum()
enum TodoStatus {
  pending,
  @JsonValue('in_progress')
  inProgress,
  completed;

  String get label => switch (this) {
        TodoStatus.pending => '未着手',
        TodoStatus.inProgress => '進行中',
        TodoStatus.completed => '完了',
      };
}
