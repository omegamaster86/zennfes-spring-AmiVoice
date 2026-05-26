import { z } from "zod";
import { TodoPrioritySchema, TodoStatusSchema } from "@/types";

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

export const UpdateTodoSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  priority: TodoPrioritySchema.optional(),
  status: TodoStatusSchema.optional(),
});
