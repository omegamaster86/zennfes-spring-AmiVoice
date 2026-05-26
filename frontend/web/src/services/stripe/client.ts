"use client";

/**
 * Stripe.js シングルトンローダー
 *
 * `loadStripe` は同一 publishable key に対して何度呼んでも同一 Promise を返す
 * ため、本来はラップ不要だが「未設定時の早期検知」と「import 経路の集約」を
 * 兼ねて services 層に置く。
 *
 * 使用例:
 *   import { Elements } from "@stripe/react-stripe-js";
 *   import { getStripe } from "@/services/stripe/client";
 *
 *   const stripePromise = getStripe();
 *   <Elements stripe={stripePromise} options={{ clientSecret }}>...</Elements>
 */

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (stripePromise) return stripePromise;

  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    if (typeof window !== "undefined") {
      console.error(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe Elements will not load.",
      );
    }
    stripePromise = Promise.resolve(null);
    return stripePromise;
  }

  stripePromise = loadStripe(key);
  return stripePromise;
}
