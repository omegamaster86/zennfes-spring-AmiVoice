"use server";

import { handler } from "@/services/handler";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import {
  type Purchase,
  type PurchaseItem,
  PurchaseItemSchema,
  PurchaseSchema,
} from "@/types/stripe-schemas";

/**
 * 購入可能アイテム一覧を取得
 */
export async function getPurchaseItems(): Promise<PurchaseItem[] | null> {
  return handler(
    "getPurchaseItems",
    async (logger) => {
      const items = await callEdgeFunction(
        "get-purchase-items",
        PurchaseItemSchema.array(),
        { method: "GET", logger },
      );
      logger.info("purchase_items_fetched", { count: items.length });
      return items;
    },
    { onError: () => null },
  );
}

/**
 * 単一の購入アイテムを取得（一覧から検索）
 *
 * 単件取得用 Edge Function を別途用意していないので、一覧 API から id で抽出する。
 */
export async function getPurchaseItem(
  id: string,
): Promise<PurchaseItem | null> {
  const items = await getPurchaseItems();
  if (items === null) return null;
  return items.find((item) => item.id === id) ?? null;
}

/**
 * 購入履歴を取得
 */
export async function getPurchases(): Promise<Purchase[] | null> {
  return handler(
    "getPurchases",
    async (logger) => {
      const purchases = await callEdgeFunction(
        "get-purchases",
        PurchaseSchema.array(),
        { method: "GET", logger },
      );
      logger.info("purchases_fetched", { count: purchases.length });
      return purchases;
    },
    { onError: () => null },
  );
}
