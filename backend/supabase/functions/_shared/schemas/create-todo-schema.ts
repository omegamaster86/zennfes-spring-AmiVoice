import { z } from "npm:zod";

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  description: z.string().nullish(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().nullish(),
});

export type CreateTodoRequest = z.infer<typeof createTodoSchema>;

export interface CreateTodoResponse {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
}
