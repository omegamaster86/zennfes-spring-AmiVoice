"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/utils";

interface DateRangeInputProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangeInput({
  value,
  onChange,
  placeholder = "期間を選択",
  className,
  disabled,
}: DateRangeInputProps) {
  const [open, setOpen] = useState(false);

  const formatRange = () => {
    if (!value?.from) return placeholder;
    if (!value.to) return format(value.from, "yyyy/MM/dd");
    return `${format(value.from, "yyyy/MM/dd")} 〜 ${format(value.to, "yyyy/MM/dd")}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {formatRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
