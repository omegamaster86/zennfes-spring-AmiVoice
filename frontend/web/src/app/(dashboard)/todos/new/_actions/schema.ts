import { z } from "zod";
import { TodoPrioritySchema } from "@/types";

/**
 * ToDo作成フォームのバリデーションスキーマ
 */
export const CreateTodoFormSchema = z.object({
  title: z
    .string()
    .min(1, "※タイトルは必須です")
    .max(100, "※タイトルは100文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "※説明は1000文字以内で入力してください")
    .optional()
    .nullable(),
  priority: TodoPrioritySchema,
});
