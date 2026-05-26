import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../register_controller.dart';

class RegisterForm extends ConsumerStatefulWidget {
  const RegisterForm({super.key});

  @override
  ConsumerState<RegisterForm> createState() => _RegisterFormState();
}

class _RegisterFormState extends ConsumerState<RegisterForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(registerControllerProvider.notifier).signUp(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(registerControllerProvider);
    final isSubmitting = state.isLoading;

    ref.listen(registerControllerProvider, (prev, next) {
      if (next.hasError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${next.error}')),
        );
      }
      if (next is AsyncData<void> && prev is! AsyncData<void>) {
        final email = _emailController.text.trim();
        context.go('/email-verification?email=${Uri.encodeComponent(email)}');
      }
    });

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
          const SizedBox(height: 16),
          TextFormField(
            controller: _passwordController,
            decoration: const InputDecoration(
              labelText: 'パスワード',
              hintText: '••••••••',
            ),
            obscureText: true,
            autofillHints: const [AutofillHints.newPassword],
            enabled: !isSubmitting,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '※パスワードは必須です';
              }
              if (value.length < 6) {
                return '※パスワードは6文字以上で入力してください';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _confirmPasswordController,
            decoration: const InputDecoration(
              labelText: 'パスワード（確認）',
              hintText: '••••••••',
            ),
            obscureText: true,
            autofillHints: const [AutofillHints.newPassword],
            enabled: !isSubmitting,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '※パスワード（確認）は必須です';
              }
              if (value != _passwordController.text) {
                return '※パスワードが一致しません';
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
                : const Text('アカウント作成'),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: isSubmitting ? null : () => context.go('/login'),
            child: const Text('すでにアカウントをお持ちの方はこちら'),
          ),
        ],
      ),
    );
  }
}
