import 'package:flutter/material.dart';
import 'package:json_annotation/json_annotation.dart';

@JsonEnum()
enum TodoPriority {
  low,
  medium,
  high;

  String get label => switch (this) {
        TodoPriority.low => '低',
        TodoPriority.medium => '中',
        TodoPriority.high => '高',
      };

  Color get color => switch (this) {
        TodoPriority.low => Colors.grey,
        TodoPriority.medium => Colors.orange,
        TodoPriority.high => Colors.red,
      };

}
