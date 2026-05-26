import { handler } from "../_shared/handler.ts";
import { setFcmTokenSchema } from "../_shared/schemas/set-fcm-token-schema.ts";
import { createAdminClient } from "../_shared/supabase.ts";

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(setFcmTokenSchema);

    const adminClient = createAdminClient();
    const { data: user, error: userError } = await adminClient
      .from("m_user")
      .select("id")
      .eq("supabase_auth_user_id", ctx.authUserId)
      .is("deleted_at", null)
      .maybeSingle();

    if (userError) {
      return ctx.error(500, "DB_ERROR", userError.message);
    }

    if (!user) {
      return ctx.error(404, "USER_NOT_FOUND", "ユーザーが見つかりません");
    }

    const { error: tokenError } = await adminClient
      .from("t_user_fcm_token")
      .upsert(
        {
          user_id: user.id,
          fcm_token: body.fcmToken,
          platform: body.platform ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "fcm_token" },
      );

    if (tokenError) {
      return ctx.error(500, "DB_ERROR", tokenError.message);
    }

    return ctx.success({ id: user.id, fcmToken: body.fcmToken });
  }),
);
