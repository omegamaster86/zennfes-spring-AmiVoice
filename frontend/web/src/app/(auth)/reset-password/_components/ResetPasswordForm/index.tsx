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
import {
  type ResetPasswordState,
  resetPasswordAction,
} from "../../_actions/auth";

const initialState: ResetPasswordState = {
  success: false,
  message: "",
};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          新しいパスワードを設定
        </CardTitle>
        <CardDescription>新しいパスワードを入力してください</CardDescription>
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
            <Label htmlFor="password">
              新しいパスワード
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
              新しいパスワード（確認）
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
            {pending ? "更新中..." : "パスワードを更新"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
