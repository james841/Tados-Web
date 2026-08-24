/**
 * Currency data that both the server and the browser need.
 *
 * Split out of `lib/currency.ts` because that module is `server-only` — it
 * fetches rates and reads request headers. The client components (the price
 * renderer, the switcher) need the currency *shapes* and the cookie name, and
 * importing them from a server-only module risks a build failure the moment one
 * of those imports stops being type-only.
 *
 * Nothing here touches the network or the request.
 */

export type CurrencyCode =
  | "ZAR"
  | "USD"
  | "EUR"
  | "GBP"
  | "NGN"
  | "KES"
  | "GHS"
  | "AUD"
  | "CAD"
  | "AED"
  | "INR";

export interface CurrencyMeta {
  code: CurrencyCode;
  /** Symbol shown before the amount. */
  symbol: string;
  /** BCP-47 tag, so Intl groups digits the way that market expects. */
  locale: string;
  /** Minor units. JPY-style zero-decimal currencies would set 0. */
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  ZAR: { code: "ZAR", symbol: "R", locale: "en-ZA", decimals: 2 },
  USD: { code: "USD", symbol: "$", locale: "en-US", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", locale: "de-DE", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", locale: "en-GB", decimals: 2 },
  NGN: { code: "NGN", symbol: "₦", locale: "en-NG", decimals: 2 },
  KES: { code: "KES", symbol: "KSh", locale: "en-KE", decimals: 2 },
  GHS: { code: "GHS", symbol: "GH₵", locale: "en-GH", decimals: 2 },
  AUD: { code: "AUD", symbol: "A$", locale: "en-AU", decimals: 2 },
  CAD: { code: "CAD", symbol: "C$", locale: "en-CA", decimals: 2 },
  AED: { code: "AED", symbol: "AED", locale: "en-AE", decimals: 2 },
  INR: { code: "INR", symbol: "₹", locale: "en-IN", decimals: 2 },
};

/** Human labels for the switcher menu — a bare code isn't obvious to everyone. */
export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  ZAR: "South African rand",
  USD: "US dollar",
  EUR: "Euro",
  GBP: "Pound sterling",
  NGN: "Nigerian naira",
  KES: "Kenyan shilling",
  GHS: "Ghanaian cedi",
  AUD: "Australian dollar",
  CAD: "Canadian dollar",
  AED: "UAE dirham",
  INR: "Indian rupee",
};

/** The settlement currency. Never converted, never overridable. */
export const BASE_CURRENCY: CurrencyCode = "ZAR";

/** Cookie holding a visitor's manual currency choice. */
export const CURRENCY_COOKIE = "tados_currency";
