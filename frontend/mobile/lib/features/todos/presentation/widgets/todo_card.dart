import 'package:flutter/material.dart';

import '../../data/models/todo.dart';

class TodoCard extends StatelessWidget {
  const TodoCard({
    super.key,
    required this.todo,
    this.onTap,
  });

  final Todo todo;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: Icon(
          Icons.flag,
          color: todo.priority.color,
          size: 20,
        ),
        title: Text(todo.title),
        subtitle: todo.description != null && todo.description!.isNotEmpty
            ? Text(
                todo.description!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              )
            : null,
        trailing: Chip(
          label: Text(
            todo.status.label,
            style: const TextStyle(fontSize: 12),
          ),
        ),
        onTap: onTap,
      ),
    );
  }
}
