"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  AddressInput,
  type AddressValue,
  AmountInput,
  BirthdayInput,
  DateInput,
  DateRangeInput,
  EmailInput,
  FileUploadInput,
  ImageUploadInput,
  PasswordInput,
  PhoneInput,
  PostalCodeInput,
  QuantityInput,
  TimeInput,
} from "@/components/input";
import { Label } from "@/components/ui/label";

export function SpecialInputSection() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<number | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [postalCode, setPostalCode] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [birthday, setBirthday] = useState<{
    year?: number;
    month?: number;
    day?: number;
  }>({});
  const [files, setFiles] = useState<File[]>([]);
  const [image, setImage] = useState<string | undefined>();
  const [address, setAddress] = useState<Partial<AddressValue>>({});

  return (
    <div className="space-y-8">
      {/* 認証系 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>メールアドレス入力</Label>
          <EmailInput value={email} onChange={setEmail} />
          {email && (
            <p className="text-xs text-muted-foreground">値: {email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>パスワード入力</Label>
          <PasswordInput value={password} onChange={setPassword} />
          {password && (
            <p className="text-xs text-muted-foreground">
              文字数: {password.length}文字
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>電話番号入力</Label>
          <PhoneInput value={phone} onChange={setPhone} />
          {phone && (
            <p className="text-xs text-muted-foreground">値: {phone}</p>
          )}
        </div>
      </div>

      {/* 数値系 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>金額入力</Label>
          <AmountInput value={amount} onChange={setAmount} placeholder="0" />
          {amount !== undefined && (
            <p className="text-xs text-muted-foreground">
              値: ¥{amount.toLocaleString("ja-JP")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>数量入力</Label>
          <QuantityInput
            value={quantity}
            onChange={setQuantity}
            min={0}
            max={99}
          />
          <p className="text-xs text-muted-foreground">値: {quantity}</p>
        </div>
      </div>

      {/* テキスト系 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>郵便番号入力</Label>
          <PostalCodeInput value={postalCode} onChange={setPostalCode} />
          {postalCode && (
            <p className="text-xs text-muted-foreground">値: {postalCode}</p>
          )}
        </div>
      </div>

      {/* 日時系 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>日付入力</Label>
          <DateInput value={date} onChange={setDate} />
          {date && (
            <p className="text-xs text-muted-foreground">
              値: {date.toLocaleDateString("ja-JP")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>時刻入力</Label>
          <TimeInput value={time} onChange={setTime} />
          {time && <p className="text-xs text-muted-foreground">値: {time}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>日付範囲入力</Label>
        <DateRangeInput value={dateRange} onChange={setDateRange} />
        {dateRange?.from && (
          <p className="text-xs text-muted-foreground">
            開始: {dateRange.from.toLocaleDateString("ja-JP")}
            {dateRange.to &&
              ` 〜 終了: ${dateRange.to.toLocaleDateString("ja-JP")}`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>生年月日入力</Label>
        <BirthdayInput value={birthday} onChange={setBirthday} />
        {birthday.year && birthday.month && birthday.day && (
          <p className="text-xs text-muted-foreground">
            値: {birthday.year}年{birthday.month}月{birthday.day}日
          </p>
        )}
      </div>

      {/* ファイル系 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>ファイルアップロード</Label>
          <FileUploadInput
            value={files}
            onChange={setFiles}
            accept=".pdf,.doc,.docx,.txt"
            maxSizeBytes={10 * 1024 * 1024}
          />
        </div>

        <div className="space-y-2">
          <Label>画像アップロード</Label>
          <ImageUploadInput
            value={image}
            onChange={setImage}
            maxSizeBytes={5 * 1024 * 1024}
          />
        </div>
      </div>

      {/* 複合系 */}
      <div className="space-y-2">
        <Label>住所入力</Label>
        <p className="text-xs text-muted-foreground">
          郵便番号を入力して「住所を検索」で都道府県・市区町村を自動補完
        </p>
        <div className="max-w-md">
          <AddressInput value={address} onChange={setAddress} />
        </div>
        {address.prefecture && (
          <p className="text-xs text-muted-foreground">
            {[
              address.prefecture,
              address.city,
              address.street,
              address.building,
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        )}
      </div>
    </div>
  );
}
