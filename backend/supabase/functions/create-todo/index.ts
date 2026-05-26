import { handler } from "../_shared/handler.ts";
import {
  type CreateTodoResponse,
  createTodoSchema,
} from "../_shared/schemas/create-todo-schema.ts";

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(createTodoSchema);

    const data = await ctx.callRpc("ins_todo", {
      p_auth_user_id: ctx.authUserId,
      p_title: body.title,
      p_description: body.description ?? null,
      p_priority: body.priority,
      p_due_date: body.dueDate ?? null,
      p_created_program: "create-todo",
    });

    return ctx.success((data as CreateTodoResponse[])?.[0] ?? null, 201);
  }),
);
