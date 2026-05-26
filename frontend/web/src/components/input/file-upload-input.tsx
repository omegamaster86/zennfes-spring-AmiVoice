"use client";

import {
  AlertCircle,
  CheckCircle2,
  File as FileIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import {
  deleteFileFromStorage,
  type UploadedFileInfo,
  uploadFileToStorage,
} from "./_apis/file-upload.server";

export { refreshSignedUrls } from "./_apis/file-upload.server";
export type { UploadedFileInfo };

type FileUploadStatus = "uploading" | "completed" | "error";

type InternalFile = {
  id: string;
  file: File;
  status: FileUploadStatus;
  error?: string;
};

interface FileUploadInputProps {
  /** ローカルモード用: 選択されたファイル一覧 */
  value?: File[];
  /** ローカルモード用: ファイル一覧の変更コールバック */
  onChange?: (files: File[]) => void;
  /** アップロードモード: Supabase Storageバケット名（指定するとアップロードモードになる） */
  bucket?: string;
  /** アップロードモード: ストレージ内のパスプレフィックス */
  storagePath?: string;
  /** アップロードモード: アップロード済みファイル一覧 */
  uploadedFiles?: UploadedFileInfo[];
  /** アップロードモード: アップロード済みファイル一覧の変更コールバック */
  onUploadedFilesChange?: (files: UploadedFileInfo[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  className?: string;
  disabled?: boolean;
}

export function FileUploadInput({
  value = [],
  onChange,
  bucket,
  storagePath,
  uploadedFiles = [],
  onUploadedFilesChange,
  accept,
  multiple = true,
  maxSizeBytes,
  className,
  disabled,
}: FileUploadInputProps) {
  const isUploadMode = !!bucket;

  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<InternalFile[]>([]);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // stale closure 対策: 最新の uploadedFiles を参照する
  const uploadedFilesRef = useRef(uploadedFiles);
  uploadedFilesRef.current = uploadedFiles;
  const onUploadedFilesChangeRef = useRef(onUploadedFilesChange);
  onUploadedFilesChangeRef.current = onUploadedFilesChange;

  const uploadSingleFile = useCallback(
    async (internalFile: InternalFile): Promise<UploadedFileInfo | null> => {
      if (!bucket) return null;

      const formData = new FormData();
      formData.set("file", internalFile.file);
      formData.set("bucket", bucket);
      if (storagePath) formData.set("storagePath", storagePath);

      const result = await uploadFileToStorage(formData);

      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === internalFile.id
            ? result.success
              ? { ...f, status: "completed" as const }
              : { ...f, status: "error" as const, error: result.error }
            : f,
        ),
      );

      if (result.success) {
        onUploadedFilesChangeRef.current?.([
          ...uploadedFilesRef.current,
          result.file,
        ]);
        return result.file;
      }
      return null;
    },
    [bucket, storagePath],
  );

  const processFiles = useCallback(
    (fileList: FileList) => {
      const newErrors: string[] = [];
      const valid: File[] = [];
      Array.from(fileList).forEach((file) => {
        if (maxSizeBytes && file.size > maxSizeBytes) {
          newErrors.push(
            `${file.name}: ファイルサイズが大きすぎます (最大${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB)`,
          );
          return;
        }
        valid.push(file);
      });
      setErrors(newErrors);

      if (valid.length === 0) return;

      if (isUploadMode) {
        const newInternalFiles: InternalFile[] = valid.map((file) => ({
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          file,
          status: "uploading" as const,
        }));

        setPendingFiles((prev) =>
          multiple ? [...prev, ...newInternalFiles] : newInternalFiles,
        );

        startTransition(async () => {
          await Promise.all(newInternalFiles.map(uploadSingleFile));
          setTimeout(() => {
            setPendingFiles((prev) =>
              prev.filter((f) => f.status !== "completed"),
            );
          }, 1500);
        });
      } else {
        onChange?.(multiple ? [...value, ...valid] : valid);
      }
    },
    [maxSizeBytes, isUploadMode, multiple, value, onChange, uploadSingleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled) processFiles(e.dataTransfer.files);
    },
    [disabled, processFiles],
  );

  const removeLocalFile = useCallback(
    (index: number) => {
      onChange?.(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const removeUploadedFile = useCallback(
    (index: number) => {
      const fileToRemove = uploadedFiles[index];
      if (!fileToRemove) return;

      const updated = uploadedFiles.filter((_, i) => i !== index);
      onUploadedFilesChange?.(updated);

      startTransition(async () => {
        await deleteFileFromStorage(fileToRemove.id);
      });
    },
    [uploadedFiles, onUploadedFilesChange],
  );

  const retryUpload = useCallback(
    (internalFile: InternalFile) => {
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === internalFile.id
            ? { ...f, status: "uploading" as const, error: undefined }
            : f,
        ),
      );
      startTransition(async () => {
        const result = await uploadSingleFile({
          ...internalFile,
          status: "uploading",
        });
        if (result) {
          setTimeout(() => {
            setPendingFiles((prev) =>
              prev.filter((f) => f.id !== internalFile.id),
            );
          }, 1500);
        }
      });
    },
    [uploadSingleFile],
  );

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const isUploading = pendingFiles.some((f) => f.status === "uploading");
  const effectiveDisabled = disabled || isUploading;

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => !effectiveDisabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!effectiveDisabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        disabled={effectiveDisabled}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary hover:bg-accent",
          effectiveDisabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">ファイルをドラッグ&ドロップ</p>
        <p className="mt-1 text-xs text-muted-foreground">
          またはクリックして選択
        </p>
        {accept && (
          <p className="mt-1 text-xs text-muted-foreground">{accept}</p>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
        disabled={effectiveDisabled}
      />

      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((err) => (
            <li key={err} className="text-xs text-destructive">
              {err}
            </li>
          ))}
        </ul>
      )}

      {/* アップロード中・エラーのファイル */}
      {isUploadMode && pendingFiles.length > 0 && (
        <ul className="space-y-2">
          {pendingFiles.map((pf) => (
            <li
              key={pf.id}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                pf.status === "error" &&
                  "border-destructive/50 bg-destructive/5",
                pf.status === "completed" &&
                  "border-green-500/50 bg-green-50 dark:bg-green-950/20",
              )}
            >
              {pf.status === "uploading" && (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
              )}
              {pf.status === "completed" && (
                <CheckCircle2 className="size-4 shrink-0 text-green-600" />
              )}
              {pf.status === "error" && (
                <AlertCircle className="size-4 shrink-0 text-destructive" />
              )}
              <span className="flex-1 truncate">{pf.file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(pf.file.size / 1024).toFixed(1)}KB
              </span>
              {pf.status === "error" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 px-2 text-xs"
                  onClick={() => retryUpload(pf)}
                >
                  再試行
                </Button>
              )}
              {pf.status !== "uploading" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => removePendingFile(pf.id)}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* アップロード済みファイル */}
      {isUploadMode && uploadedFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadedFiles.map((uf, i) => (
            <li
              key={uf.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{uf.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(uf.size / 1024).toFixed(1)}KB
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={() => removeUploadedFile(i)}
                disabled={disabled}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* ローカルモード: ファイル一覧 */}
      {!isUploadMode && value.length > 0 && (
        <ul className="space-y-2">
          {value.map((file, index) => (
            <li
              key={file.name}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)}KB
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={() => removeLocalFile(index)}
                disabled={disabled}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
