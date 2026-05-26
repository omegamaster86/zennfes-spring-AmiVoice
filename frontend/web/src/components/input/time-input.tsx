"use client";

import { Clock } from "lucide-react";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";

interface TimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

export function TimeInput({
  value = "",
  onChange,
  className,
  disabled,
  min,
  max,
}: TimeInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="relative flex items-center">
      <Clock className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <Input
        type="time"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        min={min}
        max={max}
        className={cn("pl-9", className)}
      />
    </div>
  );
}
