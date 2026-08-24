"use client";

import { createContext, useContext, useMemo } from "react";

import type { CurrencyCode, CurrencyMeta } from "@/lib/currency-shared";

/**
 * Display currency, handed down from the server.
 *
 * The rate is resolved once per request in the root layout and passed in as a
 * prop rather than fetched here — a client-side lookup would mean every visitor
 * waits on a third-party FX host before seeing a price, and would leak the
 * request on every navigation.
 *
 * `formatBase` exists alongside `format` because converted prices are always
 * shown with the rand figure they derive from: the store settles in ZAR, so the
 * rand amount is the real price and the conversion is a courtesy.
 */

interface CurrencyContextValue {
  currency: CurrencyMeta;
  /** Multiplier from ZAR. Exactly 1 when displaying rand. */
  rate: number;
  /** True when prices are being converted, i.e. the visitor is not seeing ZAR. */
  isConverted: boolean;
  available: CurrencyCode[];
  /** A rand amount in the display currency. */
  format: (zar: number) => string;
  /** The same amount in rand, always. */
  formatBase: (zar: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const ZAR_FALLBACK: CurrencyMeta = {
  code: "ZAR",
  symbol: "R",
  locale: "en-ZA",
  decimals: 2,
};

export function CurrencyProvider({
  currency,
  rate,
  available,
  children,
}: {
  currency: CurrencyMeta;
  rate: number;
  available: CurrencyCode[];
  children: React.ReactNode;
}) {
  const value = useMemo<CurrencyContextValue>(() => {
    const formatter = new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    });

    const zarFormatter = new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    });

    return {
      currency,
      rate,
      isConverted: currency.code !== "ZAR" && rate !== 1,
      available,
      format: (zar) =>
        formatter.format(Number.isFinite(zar) ? zar * rate : 0),
      formatBase: (zar) => zarFormatter.format(Number.isFinite(zar) ? zar : 0),
    };
  }, [currency, rate, available]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Read the active currency.
 *
 * Falls back to rand formatting when no provider is above it, so a component
 * rendered outside the tree (a test, an isolated admin screen) still shows a
 * sensible price instead of throwing.
 */
export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;

  const zarFormatter = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  });

  return {
    currency: ZAR_FALLBACK,
    rate: 1,
    isConverted: false,
    available: ["ZAR"],
    format: (zar) => zarFormatter.format(Number.isFinite(zar) ? zar : 0),
    formatBase: (zar) => zarFormatter.format(Number.isFinite(zar) ? zar : 0),
  };
}
