import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/enums/todo_priority.dart';
import '../../../../core/exceptions.dart';
import '../../data/models/create_todo_request.dart';
import '../../providers/todo_provider.dart';

class TodoForm extends ConsumerStatefulWidget {
  const TodoForm({super.key});

  @override
  ConsumerState<TodoForm> createState() => _TodoFormState();
}

class _TodoFormState extends ConsumerState<TodoForm> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  TodoPriority _priority = TodoPriority.medium;
  DateTime? _dueDate;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDueDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365 * 3)),
    );
    if (picked != null) {
      setState(() => _dueDate = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final request = CreateTodoRequest(
        title: _titleController.text,
        description: _descriptionController.text.isEmpty
            ? null
            : _descriptionController.text,
        priority: _priority,
        dueDate: _dueDate?.toUtc().toIso8601String(),
      );
      await ref.read(todoListProvider.notifier).createTodo(request);
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(e is AppException ? e.message : '$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: 'タイトル'),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'タイトルを入力してください';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(labelText: '説明（任意）'),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<TodoPriority>(
              value: _priority,
              decoration: const InputDecoration(labelText: '優先度'),
              items: TodoPriority.values
                  .map((p) => DropdownMenuItem(
                        value: p,
                        child: Text(p.label),
                      ))
                  .toList(),
              onChanged: (value) {
                if (value != null) setState(() => _priority = value);
              },
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                _dueDate == null
                    ? '期限日（任意）'
                    : '期限日: ${_dueDate!.year}/${_dueDate!.month.toString().padLeft(2, '0')}/${_dueDate!.day.toString().padLeft(2, '0')}',
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_dueDate != null)
                    IconButton(
                      onPressed: () => setState(() => _dueDate = null),
                      icon: const Icon(Icons.clear),
                    ),
                  IconButton(
                    onPressed: _pickDueDate,
                    icon: const Icon(Icons.calendar_today),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Todoを作成'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
