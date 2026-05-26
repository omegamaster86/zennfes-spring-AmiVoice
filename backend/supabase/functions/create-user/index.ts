import { handler } from "../_shared/handler.ts";
import {
  type CreateUserResponse,
  createUserSchema,
} from "../_shared/schemas/create-user-schema.ts";
import { createAdminClient } from "../_shared/supabase.ts";

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(createUserSchema);

    const adminClient = createAdminClient();

    // auth.users に実在するユーザーか検証
    const { data: authUser, error: authError } =
      await adminClient.auth.admin.getUserById(ctx.authUserId);

    if (authError || !authUser?.user) {
      return ctx.error(
        404,
        "USER_NOT_FOUND",
        "指定されたユーザーが見つかりません",
      );
    }

    // m_user に既にレコードが存在するか確認
    const { data: existing, error: selectError } = await adminClient
      .from("m_user")
      .select("id, email, role")
      .eq("supabase_auth_user_id", ctx.authUserId)
      .is("deleted_at", null)
      .maybeSingle();

    if (selectError) {
      return ctx.error(500, "DB_ERROR", selectError.message);
    }

    if (existing) {
      return ctx.success(existing);
    }

    // m_user レコードを新規作成
    const data = await ctx.callRpc(
      "ins_m_user",
      {
        p_auth_user_id: ctx.authUserId,
        p_email: body.email,
        p_created_program: "create-user",
      },
      { admin: true },
    );

    return ctx.success((data as CreateUserResponse[])?.[0] ?? null, 201);
  }),
);
