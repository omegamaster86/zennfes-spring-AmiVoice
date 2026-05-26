"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { FileUploadInput, type UploadedFileInfo } from "@/components/input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type CreateTodoState, createTodo } from "../../_actions/todo";

const initialState: CreateTodoState = {
  success: false,
  message: "",
};

/**
 * ToDo新規作成フォームコンポーネント（Client Component）
 * ユーザー入力とインタラクティブな処理を担当
 * useActionStateを使用したUncontrolled Component
 */
export function NewTodoForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createTodo, initialState);
  const priorityRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);

  useEffect(() => {
    if (state.success) {
      router.push("/todos");
    }
  }, [state.success, router]);

  function handleCancel() {
    router.push("/todos");
  }

  function handlePriorityChange(value: string) {
    if (priorityRef.current) {
      priorityRef.current.value = value;
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* エラーメッセージ表示 */}
      {!state.success && state.message && !state.fieldErrors && (
        <div
          className="rounded-md bg-destructive/15 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-destructive">{state.message}</p>
        </div>
      )}

      {/* タイトル入力 */}
      <div className="space-y-2">
        <Label htmlFor="title">
          タイトル <span className="text-destructive">*</span>
        </Label>
        <div>
          {state.fieldErrors?.title && (
            <p id="title-error" className="mb-1 text-sm text-destructive">
              {state.fieldErrors.title[0]}
            </p>
          )}
          <Input
            id="title"
            name="title"
            type="text"
            placeholder="例：週報を作成する"
            defaultValue={(state.payload?.get("title") || "") as string}
            disabled={pending}
            aria-invalid={state.fieldErrors?.title ? "true" : "false"}
            aria-describedby={
              state.fieldErrors?.title ? "title-error" : undefined
            }
          />
        </div>
      </div>

      {/* 説明入力 */}
      <div className="space-y-2">
        <Label htmlFor="description">説明（任意）</Label>
        <div>
          {state.fieldErrors?.description && (
            <p id="description-error" className="mb-1 text-sm text-destructive">
              {state.fieldErrors.description[0]}
            </p>
          )}
          <Textarea
            id="description"
            name="description"
            placeholder="ToDoの詳細を入力..."
            rows={5}
            disabled={pending}
            defaultValue={(state.payload?.get("description") || "") as string}
            aria-invalid={state.fieldErrors?.description ? "true" : "false"}
            aria-describedby={
              state.fieldErrors?.description ? "description-error" : undefined
            }
          />
        </div>
      </div>

      {/* 優先度選択 */}
      <div className="space-y-2">
        <Label htmlFor="priority">優先度</Label>
        <div>
          {state.fieldErrors?.priority && (
            <p id="priority-error" className="mb-1 text-sm text-destructive">
              {state.fieldErrors.priority[0]}
            </p>
          )}
          <Select
            onValueChange={handlePriorityChange}
            disabled={pending}
            defaultValue={
              (state.payload?.get("priority") || "medium") as string
            }
          >
            <SelectTrigger
              id="priority"
              className="w-full"
              aria-invalid={state.fieldErrors?.priority ? "true" : "false"}
              aria-describedby={
                state.fieldErrors?.priority ? "priority-error" : undefined
              }
            >
              <SelectValue placeholder="優先度を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">低</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="high">高</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="hidden"
            name="priority"
            defaultValue="medium"
            ref={priorityRef}
          />
        </div>
      </div>

      {/* 添付ファイル */}
      <div className="space-y-2">
        <Label>添付ファイル（任意）</Label>
        <FileUploadInput
          bucket="sample-bucket"
          storagePath="todo-attachments"
          uploadedFiles={uploadedFiles}
          onUploadedFilesChange={setUploadedFiles}
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          maxSizeBytes={10 * 1024 * 1024}
          disabled={pending}
        />
      </div>

      {/* 送信ボタン */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={pending}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "作成中..." : "ToDoを作成"}
        </Button>
      </div>
    </form>
  );
}
