import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/deep_link_state_provider.dart';

class EmailChangeConfirmedScreen extends ConsumerWidget {
  const EmailChangeConfirmedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.check_circle_outline,
                size: 64,
                color: Colors.green,
              ),
              const SizedBox(height: 24),
              Text(
                'メールアドレスを変更しました',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                '新しいメールアドレスでの認証が完了しました。',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: () {
                  ref.read(deepLinkStateProvider.notifier).state = null;
                  context.go('/todos');
                },
                child: const Text('ホームへ戻る'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
