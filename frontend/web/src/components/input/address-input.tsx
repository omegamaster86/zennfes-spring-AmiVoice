"use client";

import { Loader2, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils";
import { searchPostalCode } from "./_apis/postal-code-search.server";
import { PostalCodeInput } from "./postal-code-input";

const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

export interface AddressValue {
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building: string;
}

interface AddressInputProps {
  value?: Partial<AddressValue>;
  onChange?: (value: Partial<AddressValue>) => void;
  className?: string;
  disabled?: boolean;
}

export function AddressInput({
  value = {},
  onChange,
  className,
  disabled,
}: AddressInputProps) {
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string>();

  const update = useCallback(
    (partial: Partial<AddressValue>) => {
      onChange?.({ ...value, ...partial });
    },
    [value, onChange],
  );

  const lookupAddress = useCallback(async () => {
    const code = (value.postalCode ?? "").replace("-", "");
    if (code.length !== 7) {
      setLookupError("7桁の郵便番号を入力してください");
      return;
    }
    setLoading(true);
    setLookupError(undefined);
    try {
      const result = await searchPostalCode(code);
      if (!result) {
        setLookupError("住所の取得に失敗しました");
        return;
      }
      if (!result.success) {
        setLookupError(
          result.notFound
            ? "該当する住所が見つかりません"
            : "住所の取得に失敗しました",
        );
        return;
      }
      update({
        prefecture: result.data.prefecture,
        city: result.data.city,
        street: result.data.address,
      });
    } catch {
      setLookupError("住所の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [value.postalCode, update]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-2">
        <PostalCodeInput
          value={value.postalCode}
          onChange={(v) => update({ postalCode: v })}
          disabled={disabled}
          className="w-36"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={lookupAddress}
          disabled={disabled || loading}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Search className="size-3.5" />
          )}
          <span className="ml-1.5">住所を検索</span>
        </Button>
      </div>

      {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}

      <Select
        value={value.prefecture}
        onValueChange={(v) => update({ prefecture: v })}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="都道府県を選択" />
        </SelectTrigger>
        <SelectContent>
          {PREFECTURES.map((pref) => (
            <SelectItem key={pref} value={pref}>
              {pref}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="市区町村"
        value={value.city ?? ""}
        onChange={(e) => update({ city: e.target.value })}
        disabled={disabled}
      />

      <Input
        placeholder="番地・丁目"
        value={value.street ?? ""}
        onChange={(e) => update({ street: e.target.value })}
        disabled={disabled}
      />

      <Input
        placeholder="建物名・部屋番号（任意）"
        value={value.building ?? ""}
        onChange={(e) => update({ building: e.target.value })}
        disabled={disabled}
      />
    </div>
  );
}
