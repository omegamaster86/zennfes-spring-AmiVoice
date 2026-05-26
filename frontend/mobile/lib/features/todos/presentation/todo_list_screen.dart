import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/exceptions.dart';
import '../providers/todo_provider.dart';
import 'widgets/todo_card.dart';

class TodoListScreen extends ConsumerWidget {
  const TodoListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todosAsync = ref.watch(todoListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Todo一覧'),
      ),
      body: todosAsync.when(
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
                onPressed: () => ref.invalidate(todoListProvider),
                child: const Text('再読み込み'),
              ),
            ],
          ),
        ),
        data: (todos) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(todoListProvider),
          child: todos.isEmpty
              ? LayoutBuilder(
                  builder: (context, constraints) => SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: SizedBox(
                      height: constraints.maxHeight,
                      child: const Center(child: Text('Todoがありません')),
                    ),
                  ),
                )
              : ListView.builder(
                  itemCount: todos.length,
                  itemBuilder: (context, index) {
                    final todo = todos[index];
                    return TodoCard(
                      todo: todo,
                      onTap: () => context.push('/todos/${todo.id}'),
                    );
                  },
                ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/todos/add'),
        child: const Icon(Icons.add),
      ),
    );
  }
}
