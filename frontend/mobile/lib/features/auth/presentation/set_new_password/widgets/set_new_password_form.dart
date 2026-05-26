import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../set_new_password_controller.dart';

class SetNewPasswordForm extends ConsumerStatefulWidget {
  const SetNewPasswordForm({super.key});

  @override
  ConsumerState<SetNewPasswordForm> createState() => _SetNewPasswordFormState();
}

class _SetNewPasswordFormState extends ConsumerState<SetNewPasswordForm> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(setNewPasswordControllerProvider.notifier).updatePassword(
          newPassword: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(setNewPasswordControllerProvider);
    final isSubmitting = state.isLoading;

    ref.listen(setNewPasswordControllerProvider, (prev, next) {
      if (next.hasError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${next.error}')),
        );
      }
      if (next is AsyncData<void> && prev is! AsyncData<void>) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('パスワードを更新しました。再度ログインしてください。')),
        );
        context.go('/login');
      }
    });

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _passwordController,
            decoration: InputDecoration(
              labelText: '新しいパスワード',
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                ),
                onPressed: () {
                  setState(() => _obscurePassword = !_obscurePassword);
                },
              ),
            ),
            obscureText: _obscurePassword,
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
            controller: _confirmController,
            decoration: InputDecoration(
              labelText: 'パスワード（確認）',
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureConfirm ? Icons.visibility_off : Icons.visibility,
                ),
                onPressed: () {
                  setState(() => _obscureConfirm = !_obscureConfirm);
                },
              ),
            ),
            obscureText: _obscureConfirm,
            enabled: !isSubmitting,
            validator: (value) {
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
                : const Text('パスワードを更新'),
          ),
        ],
      ),
    );
  }
}
