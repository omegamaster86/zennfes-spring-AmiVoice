"use client";

import { Minus, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";

interface QuantityInputProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function QuantityInput({
  value = 0,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  className,
  disabled,
}: QuantityInputProps) {
  const [internalValue, setInternalValue] = useState(value);

  const update = useCallback(
    (next: number) => {
      const clamped = Math.min(max, Math.max(min, next));
      setInternalValue(clamped);
      onChange?.(clamped);
    },
    [min, max, onChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      if (raw === "") {
        setInternalValue(min);
        return;
      }
      update(parseInt(raw, 10));
    },
    [update, min],
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        onClick={() => update(internalValue - step)}
        disabled={disabled || internalValue <= min}
      >
        <Minus className="size-3.5" />
      </Button>
      <Input
        type="text"
        inputMode="numeric"
        value={internalValue}
        onChange={handleInputChange}
        disabled={disabled}
        className="w-16 text-center"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        onClick={() => update(internalValue + step)}
        disabled={disabled || internalValue >= max}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
