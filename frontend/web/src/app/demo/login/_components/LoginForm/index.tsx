"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LoginMockState, loginMockAction } from "../../_actions/auth-mock";

const initialState: LoginMockState = {
  success: false,
  message: "",
};

/**
 * デモログインフォームコンポーネント
 *
 * モックデータを使用したログインフォーム
 * Next.jsのServer Actions (action属性) を使用した実装
 * useActionStateを使用したUncontrolled Component
 */
export function LoginFormMock() {
  // useActionStateでServer Actionの結果とpending状態を管理
  const [state, formAction, pending] = useActionState(
    loginMockAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <CardTitle className="text-2xl font-bold">ログイン（デモ）</CardTitle>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
            デモモード
          </span>
        </div>
        <CardDescription>
          デモ用のアカウントでログインしてください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* デモアカウント情報 */}
          <div className="rounded-md bg-blue-50 p-4 text-sm">
            <p className="mb-2 font-semibold text-blue-900">
              📝 デモアカウント情報
            </p>
            <div className="space-y-1 text-blue-800">
              <p>
                <strong>メールアドレス:</strong> demo@example.com
              </p>
              <p>
                <strong>パスワード:</strong> 任意（6文字以上）
              </p>
            </div>
            <p className="mt-2 text-xs text-blue-700">
              ※ デモモードではパスワード認証は行われません
            </p>
          </div>

          {/* エラーメッセージ表示 */}
          {!state.success && state.message && !state.fieldErrors && (
            <div
              className="rounded-md bg-destructive/15 p-3"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm text-destructive">{state.message}</p>
            </div>
          )}

          {/* メールアドレス入力フィールド */}
          <div className="space-y-2">
            <Label htmlFor="email">
              メールアドレス
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <div>
              {state.fieldErrors?.email && (
                <p id="email-error" className="mb-1 text-sm text-red-600">
                  {state.fieldErrors.email[0]}
                </p>
              )}
              <Input
                id="email"
                name="email"
                autoComplete="email"
                className="text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="example@example.com"
                disabled={pending}
                defaultValue={(state.payload?.get("email") || "") as string}
                aria-invalid={state.fieldErrors?.email ? "true" : "false"}
                aria-describedby={
                  state.fieldErrors?.email ? "email-error" : undefined
                }
              />
            </div>
          </div>

          {/* パスワード入力フィールド */}
          <div className="space-y-2">
            <Label htmlFor="password">
              パスワード
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <div>
              {state.fieldErrors?.password && (
                <p id="password-error" className="mb-1 text-sm text-red-600">
                  {state.fieldErrors.password[0]}
                </p>
              )}
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
                disabled={pending}
                defaultValue={(state.payload?.get("password") || "") as string}
                aria-invalid={state.fieldErrors?.password ? "true" : "false"}
                aria-describedby={
                  state.fieldErrors?.password ? "password-error" : undefined
                }
              />
            </div>
          </div>

          {/* ログインボタン */}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
