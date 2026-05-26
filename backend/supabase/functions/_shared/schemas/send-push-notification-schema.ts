import { z } from "npm:zod";

export const sendPushNotificationSchema = z.object({
  title: z.string().min(1, "title is required"),
  body: z.string().min(1, "body is required"),
  route: z
    .string()
    .regex(
      /^\/(todos(?:\/[0-9a-f-]+)?|settings)$/,
      "route must be /todos, /todos/:id, or /settings",
    )
    .optional(),
  todoId: z.string().uuid("todoId must be a valid UUID").optional(),
});

export type SendPushNotificationRequest = z.infer<
  typeof sendPushNotificationSchema
>;
