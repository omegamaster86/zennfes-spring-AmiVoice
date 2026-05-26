"use client";

import Link from "next/link";
import type { SVGProps } from "react";
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
import { type LoginState, loginAction } from "../../_actions/auth";

const initialState: LoginState = {
  success: false,
  message: "",
};

function LineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
      <title>LINE</title>
      <path d="M24 4C12.95 4 4 11.37 4 20.46c0 8.15 7.08 14.98 16.66 16.27.65.14 1.53.43 1.75 1 .2.51.13 1.31.07 1.83l-.28 1.7c-.08.5-.4 1.97 1.72 1.07 2.12-.9 11.42-6.72 15.58-11.51h.01C42.32 27.7 44 24.3 44 20.46 44 11.37 35.05 4 24 4zm-8.36 22.73h-3.97c-.58 0-1.05-.47-1.05-1.05v-7.94c0-.58.47-1.05 1.05-1.05s1.05.47 1.05 1.05v6.89h2.92c.58 0 1.05.47 1.05 1.05 0 .58-.47 1.05-1.05 1.05zm4.06-1.05c0 .58-.47 1.05-1.05 1.05-.58 0-1.05-.47-1.05-1.05v-7.94c0-.58.47-1.05 1.05-1.05.58 0 1.05.47 1.05 1.05v7.94zm10.09 0c0 .45-.29.85-.72.99-.11.04-.22.06-.33.06-.33 0-.64-.16-.84-.42l-4.07-5.54v4.91c0 .58-.47 1.05-1.05 1.05-.58 0-1.05-.47-1.05-1.05v-7.94c0-.45.29-.85.72-.99.11-.04.22-.05.33-.05.33 0 .64.16.84.42l4.07 5.54v-4.92c0-.58.47-1.05 1.05-1.05.58 0 1.05.47 1.05 1.05v7.94zm6.58-3.97h-2.92v1.87h2.92c.58 0 1.05.47 1.05 1.05 0 .58-.47 1.05-1.05 1.05h-3.97c-.58 0-1.05-.47-1.05-1.05v-7.94c0-.58.47-1.05 1.05-1.05h3.97c.58 0 1.05.47 1.05 1.05 0 .58-.47 1.05-1.05 1.05h-2.92v1.87h2.92c.58 0 1.05.47 1.05 1.05 0 .58-.47 1.05-1.05 1.05z" />
    </svg>
  );
}

/**
 * LoginForm コンポーネント
 * メールアドレスとパスワードでログインするためのフォーム
 * Next.jsのServer Actions (action属性) を使用した実装
 * useActionStateを使用したUncontrolled Component
 */
export function LoginForm() {
  // useActionStateでServer Actionの結果とpending状態を管理
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
        <CardDescription>アカウントにログインしてください</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
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
                defaultValue=""
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

          {/* パスワードを忘れた場合のリンク */}
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              パスワードをお忘れですか？
            </Link>
          </div>
        </form>

        {/* 区切り線 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">または</span>
          </div>
        </div>

        {/* LINE ログインボタン */}
        <Button
          asChild
          variant="outline"
          className="w-full border-[#06C755] bg-[#06C755] text-white hover:bg-[#06C755]/90 hover:text-white"
        >
          <a
            href="/api/auth/line/start"
            aria-disabled={pending}
            tabIndex={pending ? -1 : undefined}
            className={pending ? "pointer-events-none opacity-50" : undefined}
          >
            <LineIcon className="mr-2 h-5 w-5" aria-hidden />
            LINE でログイン
          </a>
        </Button>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          アカウントをお持ちでない方は{" "}
          <Link
            href="/signup"
            className="text-primary underline-offset-4 hover:underline"
          >
            新規登録
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
