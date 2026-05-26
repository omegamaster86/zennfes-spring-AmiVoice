"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils";

interface BirthdayValue {
  year?: number;
  month?: number;
  day?: number;
}

interface BirthdayInputProps {
  value?: BirthdayValue;
  onChange?: (value: BirthdayValue) => void;
  className?: string;
  disabled?: boolean;
}

export function BirthdayInput({
  value = {},
  onChange,
  className,
  disabled,
}: BirthdayInputProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const daysInMonth =
    value.year && value.month
      ? new Date(value.year, value.month, 0).getDate()
      : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={value.year?.toString()}
        onValueChange={(v) =>
          onChange?.({ ...value, year: parseInt(v, 10), day: undefined })
        }
        disabled={disabled}
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="年" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.month?.toString()}
        onValueChange={(v) =>
          onChange?.({ ...value, month: parseInt(v, 10), day: undefined })
        }
        disabled={disabled}
      >
        <SelectTrigger className="w-20">
          <SelectValue placeholder="月" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={m.toString()}>
              {m}月
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.day?.toString()}
        onValueChange={(v) => onChange?.({ ...value, day: parseInt(v, 10) })}
        disabled={disabled || !value.month}
      >
        <SelectTrigger className="w-20">
          <SelectValue placeholder="日" />
        </SelectTrigger>
        <SelectContent>
          {days.map((d) => (
            <SelectItem key={d} value={d.toString()}>
              {d}日
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
