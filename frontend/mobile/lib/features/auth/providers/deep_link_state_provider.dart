import 'package:flutter_riverpod/flutter_riverpod.dart';

enum DeepLinkState {
  passwordRecovery,
  emailChangeConfirmed,
}

final deepLinkStateProvider = StateProvider<DeepLinkState?>((ref) => null);
