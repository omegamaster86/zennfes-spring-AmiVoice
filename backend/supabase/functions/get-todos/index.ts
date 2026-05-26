import { handler } from "../_shared/handler.ts";

Deno.serve(
  handler(
    async (_req, ctx) => {
      const data = await ctx.callRpc("sel_todos_by_user", {
        target_auth_user_id: ctx.authUserId,
      });

      return ctx.success(data ?? []);
    },
    { methods: ["GET"] },
  ),
);
