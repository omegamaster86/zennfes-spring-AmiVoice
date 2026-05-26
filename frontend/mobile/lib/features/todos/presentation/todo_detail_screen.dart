import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/exceptions.dart';
import '../providers/todo_provider.dart';

class TodoDetailScreen extends ConsumerWidget {
  const TodoDetailScreen({super.key, required this.todoId});

  final String todoId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todoAsync = ref.watch(todoDetailProvider(todoId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Todo詳細'),
      ),
      body: todoAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(error is AppException
                  ? error.message
                  : 'エラーが発生しました: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () =>
                    ref.invalidate(todoDetailProvider(todoId)),
                child: const Text('再読み込み'),
              ),
            ],
          ),
        ),
        data: (todo) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                todo.title,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 16),
              _InfoRow(label: 'ステータス', value: todo.status.label),
              _InfoRow(label: '優先度', value: todo.priority.label),
              if (todo.description != null && todo.description!.isNotEmpty)
                _InfoRow(label: '説明', value: todo.description!),
              if (todo.dueDate != null)
                _InfoRow(
                    label: '期限日', value: _formatDate(todo.dueDate!)),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatDate(String isoDate) {
  final dt = DateTime.tryParse(isoDate);
  if (dt == null) return isoDate;
  return '${dt.year}/${dt.month.toString().padLeft(2, '0')}/${dt.day.toString().padLeft(2, '0')}';
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}
