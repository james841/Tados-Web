"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart/cart-drawer";

/**
 * Client providers.
 *
 * SessionProvider must wrap anything that calls `useSession()` — the header's
 * account menu and the cart's "clear" gate both do.
 *
 * The cart drawer lives here rather than in the header so it sits outside the
 * sticky header's stacking context — inside it, the backdrop would be painted
 * under the page instead of over it.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <CartDrawer />
    </SessionProvider>
  );
}
