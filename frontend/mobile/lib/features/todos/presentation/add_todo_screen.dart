import 'package:flutter/material.dart';

import 'widgets/todo_form.dart';

class AddTodoScreen extends StatelessWidget {
  const AddTodoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Todo追加'),
      ),
      body: const SingleChildScrollView(
        child: TodoForm(),
      ),
    );
  }
}
