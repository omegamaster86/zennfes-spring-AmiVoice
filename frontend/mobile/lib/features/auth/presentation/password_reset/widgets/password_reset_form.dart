import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../password_reset_controller.dart';

class PasswordResetForm extends ConsumerStatefulWidget {
  const PasswordResetForm({super.key});

  @override
  ConsumerState<PasswordResetForm> createState() => _PasswordResetFormState();
}

class _PasswordResetFormState extends ConsumerState<PasswordResetForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _sent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(passwordResetControllerProvider.notifier).resetPassword(
          email: _emailController.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(passwordResetControllerProvider);
    final isSubmitting = state.isLoading;

    ref.listen(passwordResetControllerProvider, (prev, next) {
      if (next.hasError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${next.error}')),
        );
      }
      if (next is AsyncData<void> && prev is! AsyncData<void>) {
        setState(() => _sent = true);
      }
    });

    if (_sent) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.mark_email_read, size: 48, color: Colors.green),
          const SizedBox(height: 16),
          Text(
            'パスワードリセットメールを送信しました',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'メールに記載されたリンクからパスワードを再設定してください。',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => context.go('/login'),
            child: const Text('ログイン画面に戻る'),
          ),
        ],
      );
    }

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _emailController,
            decoration: const InputDecoration(
              labelText: 'メールアドレス',
              hintText: 'example@example.com',
            ),
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            enabled: !isSubmitting,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '※メールアドレスは必須です';
              }
              if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)) {
                return '※有効なメールアドレスを入力してください';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: isSubmitting ? null : _submit,
            child: isSubmitting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('リセットメールを送信'),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: isSubmitting ? null : () => context.go('/login'),
            child: const Text('ログイン画面に戻る'),
          ),
        ],
      ),
    );
  }
}
