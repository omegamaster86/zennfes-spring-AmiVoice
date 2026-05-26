"use client";

import { Elements } from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { useMemo } from "react";
import { getStripe } from "@/services/stripe/client";
import { CardForm } from "./CardForm";

const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#0f172a",
    borderRadius: "8px",
  },
};

/**
 * カード登録フォームのラッパー
 * SetupIntent の client_secret を受け取り Elements Provider を起動する
 */
export function AddCardForm({
  clientSecret,
  setupIntentId,
}: {
  clientSecret: string;
  setupIntentId: string;
}) {
  const stripePromise = useMemo(() => getStripe(), []);

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
        locale: "ja",
      }}
    >
      <CardForm setupIntentId={setupIntentId} />
    </Elements>
  );
}
