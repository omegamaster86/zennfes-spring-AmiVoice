"use client";

import { Mail } from "lucide-react";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";

interface EmailInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function EmailInput({
  value = "",
  onChange,
  placeholder = "example@email.com",
  className,
  disabled,
}: EmailInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value.toLowerCase());
    },
    [onChange],
  );

  return (
    <div className="relative flex items-center">
      <Mail className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <Input
        type="email"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        inputMode="email"
        className={cn("pl-9", className)}
      />
    </div>
  );
}
