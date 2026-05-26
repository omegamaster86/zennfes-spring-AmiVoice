import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/auth_provider.dart';

class LogoutButton extends ConsumerWidget {
  const LogoutButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      onPressed: () async {
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('ログアウト'),
            content: const Text('ログアウトしますか？'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('キャンセル'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('ログアウト'),
              ),
            ],
          ),
        );
        if (confirmed == true && context.mounted) {
          try {
            await ref.read(authProvider.notifier).signOut();
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('ログアウトに失敗しました')),
              );
            }
          }
        }
      },
      icon: const Icon(Icons.logout),
      tooltip: 'ログアウト',
    );
  }
}
