"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { CurrencyProvider } from "@/components/currency/currency-provider";
import type { CurrencyCode, CurrencyMeta } from "@/lib/currency-shared";

/**
 * Client providers.
 *
 * SessionProvider must wrap anything that calls `useSession()` — the header's
 * account menu and the cart's "clear" gate both do.
 *
 * CurrencyProvider takes its values as props rather than resolving them itself:
 * the rate lookup happens once per request on the server, so no visitor waits on
 * a third-party FX host before a price appears.
 *
 * The cart drawer lives here rather than in the header so it sits outside the
 * sticky header's stacking context — inside it, the backdrop would be painted
 * under the page instead of over it.
 */
export function Providers({
  currency,
  rate,
  availableCurrencies,
  children,
}: {
  currency: CurrencyMeta;
  rate: number;
  availableCurrencies: CurrencyCode[];
  children: ReactNode;
}) {
  return (
    <SessionProvider>
      <CurrencyProvider
        currency={currency}
        rate={rate}
        available={availableCurrencies}
      >
        {children}
        <CartDrawer />
      </CurrencyProvider>
    </SessionProvider>
  );
}
