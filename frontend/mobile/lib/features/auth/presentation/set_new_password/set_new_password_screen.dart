import 'package:flutter/material.dart';

import 'widgets/set_new_password_form.dart';

class SetNewPasswordScreen extends StatelessWidget {
  const SetNewPasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_reset, size: 48, color: Colors.deepPurple),
              const SizedBox(height: 16),
              Text(
                '新しいパスワードを設定',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                '新しいパスワードを入力してください',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
              ),
              const SizedBox(height: 32),
              const SetNewPasswordForm(),
            ],
          ),
        ),
      ),
    );
  }
}
