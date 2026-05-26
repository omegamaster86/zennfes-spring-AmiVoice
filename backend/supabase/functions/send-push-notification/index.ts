import {
  isInvalidFcmTokenError,
  sendFcmNotificationsWithTokens,
} from "../_shared/fcm.ts";
import { handler } from "../_shared/handler.ts";
import { sendPushNotificationSchema } from "../_shared/schemas/send-push-notification-schema.ts";
import { createAdminClient } from "../_shared/supabase.ts";

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(sendPushNotificationSchema);

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

    const { data: tokenRows, error: tokenError } = await adminClient
      .from("t_user_fcm_token")
      .select("fcm_token")
      .eq("user_id", user.id);

    if (tokenError) {
      return ctx.error(500, "DB_ERROR", tokenError.message);
    }

    const tokens = Array.from(
      new Set((tokenRows ?? []).map((row) => row.fcm_token).filter(Boolean)),
    );

    if (tokens.length === 0) {
      return ctx.error(404, "FCM_TOKEN_NOT_FOUND", "FCMトークンが未登録です");
    }

    const dataPayload: Record<string, string> = {};
    if (body.route) dataPayload.route = body.route;
    if (body.todoId) dataPayload.todoId = body.todoId;

    const sendResult = await sendFcmNotificationsWithTokens({
      tokens,
      notification: {
        title: body.title,
        body: body.body,
      },
      data: Object.keys(dataPayload).length > 0 ? dataPayload : undefined,
    });

    const invalidTokens = sendResult.errors
      .filter((err) =>
        isInvalidFcmTokenError({
          message: err.message,
          statusCode: err.statusCode,
          errorStatus: err.errorStatus,
        }),
      )
      .map((err) => err.token)
      .filter(Boolean);

    if (invalidTokens.length > 0) {
      // FCM が無効と返したトークンは将来も使えないキャッシュ的データであり
      // 履歴として保持する意義がないため物理削除する。
      await adminClient
        .from("t_user_fcm_token")
        .delete() // linter-disable: code/no-physical-delete
        .eq("user_id", user.id)
        .in("fcm_token", invalidTokens);
    }

    if (sendResult.failureCount > 0) {
      return ctx.error(
        502,
        "FCM_SEND_FAILED",
        sendResult.errors[0]?.message ?? "FCM送信に失敗しました",
      );
    }

    return ctx.success({
      delivered: true,
      successCount: sendResult.successCount,
    });
  }),
);
