// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_todo_request.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CreateTodoRequestImpl _$$CreateTodoRequestImplFromJson(
  Map<String, dynamic> json,
) => _$CreateTodoRequestImpl(
  title: json['title'] as String,
  description: json['description'] as String?,
  priority:
      $enumDecodeNullable(_$TodoPriorityEnumMap, json['priority']) ??
      TodoPriority.medium,
  dueDate: json['dueDate'] as String?,
);

Map<String, dynamic> _$$CreateTodoRequestImplToJson(
  _$CreateTodoRequestImpl instance,
) => <String, dynamic>{
  'title': instance.title,
  if (instance.description case final value?) 'description': value,
  'priority': _$TodoPriorityEnumMap[instance.priority]!,
  if (instance.dueDate case final value?) 'dueDate': value,
};

const _$TodoPriorityEnumMap = {
  TodoPriority.low: 'low',
  TodoPriority.medium: 'medium',
  TodoPriority.high: 'high',
};
