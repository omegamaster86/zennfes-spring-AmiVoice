import { z } from "npm:zod";

export const setFcmTokenSchema = z.object({
  fcmToken: z.string().min(1, "fcmToken is required"),
  platform: z.enum(["android", "ios"]).optional(),
});

export type SetFcmTokenRequest = z.infer<typeof setFcmTokenSchema>;

export interface SetFcmTokenResponse {
  id: string;
  fcmToken: string;
}
