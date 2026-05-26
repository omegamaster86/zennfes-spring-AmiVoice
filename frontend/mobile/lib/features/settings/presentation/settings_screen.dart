import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/exceptions.dart';
import '../../auth/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('設定'),
      ),
      body: ListView(
        children: const [
          _SettingsSection(
            title: '通知',
            children: [
              _SendTestNotificationTile(),
            ],
          ),
          _SettingsSection(
            title: 'アカウント',
            children: [
              _LogoutTile(),
            ],
          ),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                ),
          ),
        ),
        ...children,
      ],
    );
  }
}

class _LogoutTile extends ConsumerWidget {
  const _LogoutTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      leading: const Icon(Icons.logout),
      title: const Text('ログアウト'),
      onTap: () async {
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
    );
  }
}

class _SendTestNotificationTile extends ConsumerStatefulWidget {
  const _SendTestNotificationTile();

  @override
  ConsumerState<_SendTestNotificationTile> createState() =>
      _SendTestNotificationTileState();
}

class _SendTestNotificationTileState
    extends ConsumerState<_SendTestNotificationTile> {
  bool _sending = false;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: const Icon(Icons.notifications_active),
      title: const Text('通知テストを送信'),
      subtitle: const Text('この端末にテスト通知を送信します'),
      enabled: !_sending,
      trailing: _sending
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : null,
      onTap: _sending ? null : _sendTestNotification,
    );
  }

  Future<void> _sendTestNotification() async {
    setState(() => _sending = true);

    try {
      final response = await Supabase.instance.client.functions.invoke(
        'send-push-notification',
        body: {
          'title': '通知テスト',
          'body': 'アプリからのテスト通知です（${DateTime.now()}）',
          'route': '/todos',
        },
      );

      if (!mounted) return;
      if (response.status >= 400) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          throw EdgeFunctionException.fromResponse(data);
        }
        throw AppException('通知送信に失敗しました', statusCode: response.status);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('通知送信を受け付けました')),
      );
    } on AppException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('通知送信に失敗しました: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }
}
