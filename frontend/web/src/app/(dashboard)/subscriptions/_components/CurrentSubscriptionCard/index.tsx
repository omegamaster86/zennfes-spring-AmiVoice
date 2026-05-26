import { getCurrentSubscription } from "../../_apis/subscription.server";
import { CurrentSubscriptionCardClient } from "./CurrentSubscriptionCardClient";

/**
 * 現在の契約状態カード（Server Component）
 *
 * 契約状態を取得して Client Component（解約フォーム）に渡す。
 */
export async function CurrentSubscriptionCard() {
  const current = await getCurrentSubscription();

  return <CurrentSubscriptionCardClient subscription={current} />;
}
