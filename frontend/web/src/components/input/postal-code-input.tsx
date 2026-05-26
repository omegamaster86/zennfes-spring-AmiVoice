"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";

interface PostalCodeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PostalCodeInput({
  value = "",
  onChange,
  placeholder = "000-0000",
  className,
  disabled,
}: PostalCodeInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 7);
      const formatted =
        raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
      onChange?.(formatted);
    },
    [onChange],
  );

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={8}
      className={cn(className)}
    />
  );
}
