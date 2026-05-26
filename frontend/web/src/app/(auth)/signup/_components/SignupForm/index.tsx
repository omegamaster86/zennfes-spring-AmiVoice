"use client";

import Link from "next/link";
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
import { type SignupState, signupAction } from "../../_actions/auth";

const initialState: SignupState = {
  success: false,
  message: "",
};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">アカウント登録</CardTitle>
        <CardDescription>新しいアカウントを作成してください</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {!state.success && state.message && !state.fieldErrors && (
            <div
              className="rounded-md bg-destructive/15 p-3"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm text-destructive">{state.message}</p>
            </div>
          )}

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
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={pending}
                aria-invalid={state.fieldErrors?.password ? "true" : "false"}
                aria-describedby={
                  state.fieldErrors?.password ? "password-error" : undefined
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              パスワード（確認）
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <div>
              {state.fieldErrors?.confirmPassword && (
                <p
                  id="confirm-password-error"
                  className="mb-1 text-sm text-red-600"
                >
                  {state.fieldErrors.confirmPassword[0]}
                </p>
              )}
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={pending}
                aria-invalid={
                  state.fieldErrors?.confirmPassword ? "true" : "false"
                }
                aria-describedby={
                  state.fieldErrors?.confirmPassword
                    ? "confirm-password-error"
                    : undefined
                }
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "登録中..." : "アカウントを作成"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            すでにアカウントをお持ちの方は{" "}
            <Link
              href="/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              ログイン
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
