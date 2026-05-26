"use client";

import { Phone } from "lucide-react";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";

const PHONE_PATTERNS: Record<string, RegExp> = {
  mobile: /^(070|080|090)/,
  freeCall: /^(0120|0800)/,
  ip: /^050/,
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 11);

  if (PHONE_PATTERNS.freeCall.test(digits)) {
    // 0120-XXX-XXX / 0800-XXX-XXXX
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (PHONE_PATTERNS.mobile.test(digits) || PHONE_PATTERNS.ip.test(digits)) {
    // 090-XXXX-XXXX / 050-XXXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  // 固定電話: 市外局番の長さに応じてハイフン位置が異なるため簡易的に対応
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  if (digits.length <= 10)
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder = "090-0000-0000",
  className,
  disabled,
}: PhoneInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(formatPhone(e.target.value));
    },
    [onChange],
  );

  return (
    <div className="relative flex items-center">
      <Phone className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <Input
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="tel"
        inputMode="tel"
        className={cn("pl-9", className)}
      />
    </div>
  );
}
