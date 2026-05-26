/**
 * Stripe 関連の表示用フォーマッタ
 */

const ZERO_DECIMAL_CURRENCIES = new Set(["jpy", "krw", "vnd", "clp"]);

/**
 * 金額を通貨記号付きでローカライズ表示する
 *
 * Stripe は通貨最小単位（JPY なら円、USD ならセント）で金額を保持するため、
 * 2 桁通貨は 100 で割って表示する。
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = "ja-JP",
): string {
  const upper = currency.toUpperCase();
  const lower = currency.toLowerCase();
  const value = ZERO_DECIMAL_CURRENCIES.has(lower) ? amount : amount / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: upper,
      maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(lower) ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString(locale)} ${upper}`;
  }
}

/** カードブランドの内部表記（小文字）を表示用ラベルに変換 */
export function formatCardBrand(brand: string | null | undefined): string {
  if (!brand) return "カード";
  const normalized = brand.toLowerCase();
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    jcb: "JCB",
    discover: "Discover",
    diners: "Diners Club",
    unionpay: "UnionPay",
    cartes_bancaires: "Cartes Bancaires",
    eftpos_au: "Eftpos",
    unknown: "カード",
  };
  return map[normalized] ?? brand.toUpperCase();
}

/** 月/年を MM/YY 形式で表示 */
export function formatExpiry(
  month: string | null,
  year: string | null,
): string {
  if (!month || !year) return "";
  const m = month.padStart(2, "0");
  const y = year.length === 4 ? year.slice(-2) : year;
  return `${m}/${y}`;
}
