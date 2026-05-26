import { LoginForm } from "./_components/LoginForm";

/**
 * ログイン画面
 * メールアドレスとパスワードでログインする画面
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}
