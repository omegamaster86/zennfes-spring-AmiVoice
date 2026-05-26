// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'todo.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TodoImpl _$$TodoImplFromJson(Map<String, dynamic> json) => _$TodoImpl(
  id: (json['id'] as num).toInt(),
  title: json['title'] as String,
  description: json['description'] as String?,
  status: $enumDecode(_$TodoStatusEnumMap, json['status']),
  priority: $enumDecode(_$TodoPriorityEnumMap, json['priority']),
  dueDate: json['dueDate'] as String?,
);

Map<String, dynamic> _$$TodoImplToJson(_$TodoImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'description': instance.description,
      'status': _$TodoStatusEnumMap[instance.status]!,
      'priority': _$TodoPriorityEnumMap[instance.priority]!,
      'dueDate': instance.dueDate,
    };

const _$TodoStatusEnumMap = {
  TodoStatus.pending: 'pending',
  TodoStatus.inProgress: 'in_progress',
  TodoStatus.completed: 'completed',
};

const _$TodoPriorityEnumMap = {
  TodoPriority.low: 'low',
  TodoPriority.medium: 'medium',
  TodoPriority.high: 'high',
};
