"use client";

import { ImageIcon, Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

interface ImageUploadInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  maxSizeBytes?: number;
  className?: string;
  disabled?: boolean;
}

export function ImageUploadInput({
  value,
  onChange,
  maxSizeBytes = 5 * 1024 * 1024,
  className,
  disabled,
}: ImageUploadInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("画像ファイルを選択してください");
        return;
      }
      if (file.size > maxSizeBytes) {
        setError(
          `ファイルサイズが大きすぎます (最大${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB)`,
        );
        return;
      }
      setError(undefined);
      const reader = new FileReader();
      reader.onload = (e) => onChange?.(e.target?.result as string);
      reader.readAsDataURL(file);
    },
    [maxSizeBytes, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [disabled, processFile],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        <div className="relative w-fit">
          <Image
            src={value}
            alt="プレビュー"
            width={0}
            height={0}
            sizes="100vw"
            className="max-h-48 w-auto rounded-lg border object-contain"
            unoptimized
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 size-6"
            onClick={() => onChange?.(undefined)}
            disabled={disabled}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          disabled={disabled}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary hover:bg-accent",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <ImageIcon className="mb-2 size-10 text-muted-foreground" />
          <p className="text-sm font-medium">画像をドラッグ&ドロップ</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPG, WEBP (最大{(maxSizeBytes / 1024 / 1024).toFixed(0)}MB)
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={disabled}
          >
            <Upload className="mr-1.5 size-3.5" />
            ファイルを選択
          </Button>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        disabled={disabled}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
