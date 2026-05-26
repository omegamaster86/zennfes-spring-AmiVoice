"use client";

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";

interface AmountInputProps {
  value?: number;
  onChange?: (value: number | undefined) => void;
  currency?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AmountInput({
  value,
  onChange,
  currency = "¥",
  placeholder = "0",
  className,
  disabled,
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    value !== undefined ? value.toLocaleString("ja-JP") : "",
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      const num = raw === "" ? undefined : parseInt(raw, 10);
      setDisplayValue(
        raw === "" ? "" : parseInt(raw, 10).toLocaleString("ja-JP"),
      );
      onChange?.(num);
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    if (displayValue) {
      const raw = displayValue.replace(/[^\d]/g, "");
      const num = parseInt(raw, 10);
      if (!Number.isNaN(num)) {
        setDisplayValue(num.toLocaleString("ja-JP"));
      }
    }
  }, [displayValue]);

  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 select-none text-sm text-muted-foreground">
        {currency}
      </span>
      <Input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pl-7", className)}
      />
    </div>
  );
}
