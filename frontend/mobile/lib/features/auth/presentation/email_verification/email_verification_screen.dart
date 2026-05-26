import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class EmailVerificationScreen extends StatelessWidget {
  const EmailVerificationScreen({super.key, required this.email});

  final String email;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.mark_email_unread_outlined,
                size: 64,
                color: Colors.deepPurple,
              ),
              const SizedBox(height: 24),
              Text(
                'メールを確認してください',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                email,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'に確認メールを送信しました。\nメール内のリンクをクリックして\nアカウントを有効にしてください。',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.amber.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'メールが届かない場合は、迷惑メールフォルダもご確認ください。',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.amber.shade900,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('ログイン画面に戻る'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
