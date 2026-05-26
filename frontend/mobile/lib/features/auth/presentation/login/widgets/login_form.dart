import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:your_app/core/exceptions.dart';
import '../login_controller.dart';

/// ログインフォーム。
/// Web の LoginForm/index.tsx に対応。
///
/// バリデーションルール（Web の auth.ts と同一）:
///   - メールアドレス: 必須、有効な形式
///   - パスワード: 必須、6文字以上
class LoginForm extends ConsumerStatefulWidget {
  const LoginForm({super.key});

  @override
  ConsumerState<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends ConsumerState<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(loginControllerProvider.notifier).signIn(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(loginControllerProvider);
    final isSubmitting = state.isLoading;

    ref.listen(loginControllerProvider, (_, next) {
      if (next.hasError) {
        final error = next.error;
        if (error is EmailNotVerifiedException) {
          context.go(
            '/email-verification?email=${Uri.encodeComponent(error.email)}',
          );
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$error')),
        );
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
            autofillHints: const [AutofillHints.password],
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
                : const Text('ログイン'),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed:
                  isSubmitting ? null : () => context.go('/password-reset'),
              child: const Text('パスワードをお忘れの方'),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: isSubmitting ? null : () => context.go('/register'),
            child: const Text('アカウントをお持ちでない方はこちら'),
          ),
        ],
      ),
    );
  }
}
