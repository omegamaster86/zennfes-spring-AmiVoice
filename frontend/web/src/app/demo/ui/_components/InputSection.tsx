"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function InputSection() {
  const [sliderValue, setSliderValue] = useState([50]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [switchOn, setSwitchOn] = useState(false);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input & Textarea */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-input">Input</Label>
            <Input id="demo-input" placeholder="テキストを入力…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-input-disabled">Input (disabled)</Label>
            <Input id="demo-input-disabled" placeholder="無効状態" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-textarea">Textarea</Label>
            <Textarea
              id="demo-textarea"
              placeholder="複数行のテキストを入力…"
              rows={3}
            />
          </div>
        </div>

        {/* Select */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="項目を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">りんご</SelectItem>
                <SelectItem value="banana">バナナ</SelectItem>
                <SelectItem value="orange">みかん</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checkbox */}
          <div className="space-y-2">
            <Label>Checkbox</Label>
            <div className="space-y-2">
              {["通知を受け取る", "メールマガジンを購読", "利用規約に同意"].map(
                (label) => (
                  <div key={label} className="flex items-center gap-2">
                    <Checkbox id={label} />
                    <Label
                      htmlFor={label}
                      className="font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Radio Group */}
          <div className="space-y-2">
            <Label>Radio Group</Label>
            <RadioGroup defaultValue="option-a">
              {[
                { value: "option-a", label: "オプション A" },
                { value: "option-b", label: "オプション B" },
                { value: "option-c", label: "オプション C" },
              ].map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={value} />
                  <Label htmlFor={value} className="font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* Switch & Slider */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Switch</Label>
            <div className="flex items-center gap-3">
              <Switch
                checked={switchOn}
                onCheckedChange={setSwitchOn}
                id="demo-switch"
              />
              <Label
                htmlFor="demo-switch"
                className="font-normal cursor-pointer"
              >
                {switchOn ? "オン" : "オフ"}
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Slider — 現在値: {sliderValue[0]}</Label>
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Calendar */}
        <div className="space-y-2">
          <Label>Calendar</Label>
          <div className="border rounded-lg w-fit">
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </div>
          {date && (
            <p className="text-sm text-muted-foreground">
              選択日: {date.toLocaleDateString("ja-JP")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
