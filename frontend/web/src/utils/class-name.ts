import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS クラス名をマージするユーティリティ関数
 * clsx で条件付きクラスを生成し、tailwind-merge で競合を解決
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
