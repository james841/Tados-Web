"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Client providers.
 *
 * SessionProvider must wrap anything that calls `useSession()` — the header's
 * account menu and the cart's "clear" gate both do.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
