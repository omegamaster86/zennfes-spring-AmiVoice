import { z } from "npm:zod";

export const createUserSchema = z.object({
  email: z.string().email("有効なメールアドレスを指定してください"),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;

export interface CreateUserResponse {
  id: string;
  email: string;
  role: string;
}
