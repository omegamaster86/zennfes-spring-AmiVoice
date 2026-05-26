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
import {
  type ForgotPasswordState,
  forgotPasswordAction,
} from "../../_actions/auth";

const initialState: ForgotPasswordState = {
  success: false,
  message: "",
};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          パスワードをお忘れですか？
        </CardTitle>
        <CardDescription>
          登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <div
            className="rounded-md bg-green-50 p-4 text-sm text-green-800"
            role="alert"
            aria-live="polite"
          >
            {state.message}
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state.message && !state.fieldErrors && (
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

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "送信中..." : "リセットメールを送信"}
            </Button>
          </form>
        )}

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            ログインに戻る
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
