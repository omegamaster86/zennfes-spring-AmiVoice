"use server";

import { redirect } from "next/navigation";
import { createLogger } from "@/services/logger";
import { createClient } from "@/services/supabase/server";

export async function logoutAction(): Promise<void> {
  const logger = createLogger("logoutAction");
  logger.start();

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error(error, { context: "auth_signout" });
    } else {
      logger.info("logout_success");
    }
    logger.end({ success: !error });
  } catch (error) {
    logger.error(error, { context: "logoutAction" });
    logger.end({
      success: false,
      errorMessage: "予期しないエラーが発生しました",
    });
  }

  redirect("/login");
}
