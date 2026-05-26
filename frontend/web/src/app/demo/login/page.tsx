import { LoginFormMock } from "./_components/LoginForm";

/**
 * デモログイン画面
 *
 * モックデータを使用したログイン画面
 * メールアドレスを入力するだけでログイン可能（パスワード認証なし）
 */
export default function DemoLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12 sm:px-6 lg:px-8">
      <LoginFormMock />
    </div>
  );
}
