"use client";

import { useEffect } from "react";

import { useCart } from "@/store/cart";

/**
 * Empties the cart once an order is confirmed.
 *
 * Deliberately not done at handoff time: if the customer bails out on the
 * PayFast page, their cart should still be there when they come back. Only a
 * settled order clears it.
 */
export function ClearCartOnMount({ enabled }: { enabled: boolean }) {
  const clear = useCart((s) => s.clear);

  useEffect(() => {
    if (enabled) clear();
  }, [enabled, clear]);

  return null;
}
