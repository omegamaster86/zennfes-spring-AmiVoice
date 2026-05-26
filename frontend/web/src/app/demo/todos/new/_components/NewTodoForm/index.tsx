"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef } from "react";
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
import { type CreateTodoState, createTodoMock } from "../../_actions/todo-mock";

/**
 * 初期状態
 */
const initialState: CreateTodoState = {
  success: false,
  message: "",
};

/**
 * デモToDo新規作成フォームコンポーネント（Client Component）
 * モックデータを使用したuncontrolled component
 */
export function NewTodoForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createTodoMock,
    initialState,
  );
  const priorityRef = useRef<HTMLInputElement>(null);

  /**
   * キャンセル処理
   */
  function handleCancel() {
    router.push("/demo/todos");
  }

  /**
   * Select値変更時にhiddenフィールドを更新
   */
  function handlePriorityChange(value: string) {
    if (priorityRef.current) {
      priorityRef.current.value = value;
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* デモモード表示 */}
      <div className="rounded-md bg-blue-50 p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>デモモード：</strong>
              作成したデータはサーバーのメモリ内に保存されます。
            </p>
          </div>
        </div>
      </div>

      {/* エラーメッセージ表示 */}
      {!state.success && state.message && !state.fieldErrors && (
        <div
          className="rounded-md bg-red-50 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-red-800">{state.message}</p>
        </div>
      )}

      {/* タイトル入力 */}
      <div className="space-y-2">
        <Label htmlFor="title">
          タイトル <span className="text-red-500">*</span>
        </Label>
        <div>
          {state.fieldErrors?.title && (
            <p id="title-error" className="mb-1 text-sm text-red-600">
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
            <p id="description-error" className="mb-1 text-sm text-red-600">
              {state.fieldErrors.description[0]}
            </p>
          )}
          <textarea
            id="description"
            name="description"
            placeholder="ToDoの詳細を入力..."
            rows={5}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-gray-900"
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
            <p id="priority-error" className="mb-1 text-sm text-red-600">
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
          {/* FormDataに値を渡すためのhiddenフィールド */}
          <input
            type="hidden"
            name="priority"
            defaultValue="medium"
            ref={priorityRef}
          />
        </div>
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
        <Button
          type="submit"
          className="bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending}
        >
          {pending ? "作成中..." : "ToDoを作成"}
        </Button>
      </div>
    </form>
  );
}
