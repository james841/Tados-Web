import "server-only";

import { cacheGet, cacheSet } from "@/lib/redis";
import {
  BASE_CURRENCY,
  CURRENCIES,
  type CurrencyCode,
  type CurrencyMeta,
} from "@/lib/currency-shared";

/**
 * Per-visitor display currency — the server half.
 *
 * The client's brief: "prices need to appear automatically in the currency of
 * the country the person is opening from."
 *
 * The important constraint is that PayFast settles in ZAR only. So this converts
 * for *display* and the cart, checkout and the amount actually charged stay in
 * rand. Anything else would mean signing a PayFast request for one currency and
 * charging another, and would make refunds and order history ambiguous the
 * moment a rate moved. Every converted price is therefore labelled as an
 * approximation with the rand amount alongside it — which is also what the
 * Consumer Protection Act expects of a displayed price.
 *
 * Rates are fetched once an hour and cached. If the fetch fails the site falls
 * back to rand for everyone: a stale or missing rate must never invent a number.
 *
 * The currency table and the cookie name live in `lib/currency-shared.ts` so the
 * browser can use them without importing this module.
 */

export type { CurrencyCode, CurrencyMeta };
export { CURRENCIES };

/**
 * ISO-3166 country → display currency.
 *
 * Deliberately a short list rather than every country on earth. A visitor from
 * an unlisted country sees USD, which is more useful to them than a currency
 * we have no rate for, and far more useful than a rand figure they can't judge.
 * Southern African neighbours are pointed at USD too — their currencies are
 * rand-pegged in practice but we don't quote pegs we haven't verified.
 */
const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  ZA: "ZAR",
  US: "USD",
  GB: "GBP",
  NG: "NGN",
  KE: "KES",
  GH: "GHS",
  AU: "AUD",
  CA: "CAD",
  AE: "AED",
  IN: "INR",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  NL: "EUR",
  ES: "EUR",
  IT: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  FI: "EUR",
};

const RATES_CACHE_KEY = "fx:zar-base";
const RATES_TTL_SECONDS = 3600;

/** Multipliers from 1 ZAR. ZAR is always present and always exactly 1. */
export type RateTable = Record<string, number>;

/**
 * Read the visitor's country from the edge headers the host sets.
 *
 * Vercel provides `x-vercel-ip-country`, Cloudflare `cf-ipcountry`. Neither
 * exists in local development, which is why this returns null rather than
 * guessing — the caller then shows rand, the correct default for a South
 * African store.
 *
 * `accept-language` is deliberately *not* used as a fallback. It reports the
 * browser's language, not the visitor's location: a South African running an
 * en-US browser would be shown dollars on a rand-settled store.
 */
export function detectCountry(headers: Headers): string | null {
  const raw =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-country-code");

  if (!raw) return null;

  const code = raw.trim().toUpperCase();
  // Cloudflare sends "XX" for anonymised or unresolvable clients.
  if (code.length !== 2 || code === "XX" || code === "T1") return null;

  return code;
}

export function currencyForCountry(country: string | null): CurrencyCode {
  if (!country) return BASE_CURRENCY;
  return COUNTRY_CURRENCY[country] ?? "USD";
}

/**
 * Exchange rates with 1 ZAR as the base.
 *
 * open.er-api.com needs no API key and no account, which keeps this working on
 * a fresh deploy with nothing configured. The 4-second timeout is deliberate:
 * this runs in the request path for the root layout, so a slow FX host must
 * degrade to rand rather than hold up the page.
 */
export async function getRates(): Promise<RateTable> {
  const cached = await cacheGet<RateTable>(RATES_CACHE_KEY);
  if (cached && typeof cached.ZAR === "number") return cached;

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/ZAR", {
      signal: AbortSignal.timeout(4_000),
      // Next would otherwise cache this indefinitely in its own fetch cache and
      // the hourly Redis TTL would stop meaning anything.
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`FX host returned ${res.status}`);

    const body = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };

    if (body.result !== "success" || !body.rates) {
      throw new Error("FX host returned an unsuccessful payload");
    }

    // Keep only what we display. The response carries ~160 currencies and there
    // is no reason to push all of them into Redis or down to the browser.
    const table: RateTable = { ZAR: 1 };
    for (const code of Object.keys(CURRENCIES)) {
      const rate = body.rates[code];
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
        table[code] = rate;
      }
    }

    await cacheSet(RATES_CACHE_KEY, table, RATES_TTL_SECONDS);
    return table;
  } catch (error) {
    console.warn(
      "[currency] rate lookup failed, falling back to ZAR only:",
      error instanceof Error ? error.message : error,
    );
    return { ZAR: 1 };
  }
}

/**
 * Everything the browser needs to render prices, resolved once per request.
 *
 * A cookie set by the currency switcher wins over geo-detection — an explicit
 * choice should survive the next page load. An unrecognised or unsupported
 * cookie value is ignored rather than trusted.
 */
export async function resolveCurrency(
  headers: Headers,
  cookieValue?: string,
): Promise<{
  currency: CurrencyMeta;
  rate: number;
  available: CurrencyCode[];
  detectedCountry: string | null;
}> {
  const rates = await getRates();
  const country = detectCountry(headers);

  const fromCookie =
    cookieValue && cookieValue in CURRENCIES
      ? (cookieValue as CurrencyCode)
      : null;

  const wanted = fromCookie ?? currencyForCountry(country);

  // A currency with no rate this hour is not displayable, however it was chosen.
  const code: CurrencyCode = rates[wanted] ? wanted : BASE_CURRENCY;

  return {
    currency: CURRENCIES[code],
    rate: rates[code] ?? 1,
    available: (Object.keys(CURRENCIES) as CurrencyCode[]).filter(
      (c) => rates[c],
    ),
    detectedCountry: country,
  };
}
