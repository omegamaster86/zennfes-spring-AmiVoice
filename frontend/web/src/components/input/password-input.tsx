"use client";

import { Eye, EyeOff } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";

interface PasswordInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoComplete?: "current-password" | "new-password";
}

export function PasswordInput({
  value = "",
  onChange,
  placeholder = "パスワードを入力",
  className,
  disabled,
  autoComplete = "current-password",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="relative flex items-center">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={cn("pr-10", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 size-7 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "パスワードを隠す" : "パスワードを表示"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}
