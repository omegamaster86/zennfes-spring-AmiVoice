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
import { Separator } from "@/components/ui/separator";
import {
  type UpdateEmailState,
  type UpdatePasswordState,
  updateEmailAction,
  updatePasswordAction,
} from "../../_actions/profile";

const initialEmailState: UpdateEmailState = { success: false, message: "" };
const initialPasswordState: UpdatePasswordState = {
  success: false,
  message: "",
};

type Props = {
  currentEmail: string;
};

export function ProfileForm({ currentEmail }: Props) {
  const [emailState, emailFormAction, emailPending] = useActionState(
    updateEmailAction,
    initialEmailState,
  );
  const [passwordState, passwordFormAction, passwordPending] = useActionState(
    updatePasswordAction,
    initialPasswordState,
  );

  return (
    <div className="space-y-6">
      {/* メールアドレス変更 */}
      <Card>
        <CardHeader>
          <CardTitle>メールアドレス</CardTitle>
          <CardDescription>
            変更後、新しいメールアドレスに確認メールが届きます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={emailFormAction} className="space-y-4">
            {emailState.message && (
              <div
                className={`rounded-md p-3 ${
                  emailState.success
                    ? "bg-green-50 text-green-800"
                    : "bg-destructive/15 text-destructive"
                }`}
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm">{emailState.message}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">
                新しいメールアドレス
                <span className="ml-1 text-destructive">*</span>
              </Label>
              <div>
                {emailState.fieldErrors?.email && (
                  <p id="email-error" className="mb-1 text-sm text-red-600">
                    {emailState.fieldErrors.email[0]}
                  </p>
                )}
                <Input
                  id="email"
                  name="email"
                  autoComplete="email"
                  placeholder={currentEmail}
                  disabled={emailPending}
                  defaultValue={
                    (emailState.payload?.get("email") || "") as string
                  }
                  aria-invalid={
                    emailState.fieldErrors?.email ? "true" : "false"
                  }
                  aria-describedby={
                    emailState.fieldErrors?.email ? "email-error" : undefined
                  }
                />
              </div>
            </div>

            <Button type="submit" disabled={emailPending}>
              {emailPending ? "変更中..." : "メールアドレスを変更"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* パスワード変更 */}
      <Card>
        <CardHeader>
          <CardTitle>パスワード変更</CardTitle>
          <CardDescription>新しいパスワードを設定します</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={passwordFormAction} className="space-y-4">
            {passwordState.message && (
              <div
                className={`rounded-md p-3 ${
                  passwordState.success
                    ? "bg-green-50 text-green-800"
                    : "bg-destructive/15 text-destructive"
                }`}
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm">{passwordState.message}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">
                新しいパスワード
                <span className="ml-1 text-destructive">*</span>
              </Label>
              <div>
                {passwordState.fieldErrors?.password && (
                  <p id="password-error" className="mb-1 text-sm text-red-600">
                    {passwordState.fieldErrors.password[0]}
                  </p>
                )}
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={passwordPending}
                  aria-invalid={
                    passwordState.fieldErrors?.password ? "true" : "false"
                  }
                  aria-describedby={
                    passwordState.fieldErrors?.password
                      ? "password-error"
                      : undefined
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
                {passwordState.fieldErrors?.confirmPassword && (
                  <p
                    id="confirm-password-error"
                    className="mb-1 text-sm text-red-600"
                  >
                    {passwordState.fieldErrors.confirmPassword[0]}
                  </p>
                )}
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={passwordPending}
                  aria-invalid={
                    passwordState.fieldErrors?.confirmPassword
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    passwordState.fieldErrors?.confirmPassword
                      ? "confirm-password-error"
                      : undefined
                  }
                />
              </div>
            </div>

            <Button type="submit" disabled={passwordPending}>
              {passwordPending ? "変更中..." : "パスワードを変更"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
