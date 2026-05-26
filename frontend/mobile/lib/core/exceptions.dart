class AppException implements Exception {
  const AppException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'AppException($statusCode): $message';
}

class EdgeFunctionException extends AppException {
  const EdgeFunctionException(super.message, {super.statusCode});

  factory EdgeFunctionException.fromResponse(Map<String, dynamic> json) {
    final error = json['error'];
    final String message;
    if (error is Map<String, dynamic>) {
      message = error['message'] as String? ?? 'Unknown error';
    } else if (error is String) {
      message = error;
    } else {
      message = 'Unknown error';
    }
    return EdgeFunctionException(
      message,
      statusCode: json['statusCode'] as int?,
    );
  }
}

class NetworkException extends AppException {
  const NetworkException([super.message = 'ネットワークに接続できません']);
}

class EmailNotVerifiedException extends AppException {
  const EmailNotVerifiedException({
    required this.email,
    String message = 'メール確認が完了していません',
  }) : super(message);

  final String email;
}
