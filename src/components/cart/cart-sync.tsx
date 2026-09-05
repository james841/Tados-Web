"use client";

import { useEffect, useRef } from "react";

import { useCart, type CartProductState } from "@/store/cart";

/**
 * Brings a restored cart up to date with the database.
 *
 * Cart items are snapshots taken when "add to cart" was pressed, and they are
 * persisted, so they outlive any edit made in the admin panel. Rename a product
 * and every bag that already held it keeps showing the old name; reprice one and
 * the bag keeps quoting the old price until checkout corrects it. This runs once
 * per page load and rewrites those snapshots from the server.
 *
 * Costs nothing on an empty cart, which is most page loads: with no items there
 * is no request at all.
 *
 * Failure is silent by design. A stale name is a much smaller problem than a
 * cart that empties itself because a fetch timed out, so anything other than a
 * good response leaves the stored items exactly as they were.
 */
export function CartSync() {
  const items = useCart((s) => s.items);
  const reconcile = useCart((s) => s.reconcile);

  /**
   * `items` is a new array on every store write, so this can't depend on it
   * without re-running on each quantity step. The ref pins the sync to "once
   * per mount", and reads the items at call time rather than closing over them.
   */
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;

    // Zustand's persist middleware rehydrates asynchronously, so the first
    // render can legitimately have an empty cart that is about to be filled.
    // Waiting for a non-empty list means we sync the restored cart, not the
    // blank one that preceded it.
    const stored = useCart.getState().items;
    if (stored.length === 0) return;

    done.current = true;

    const controller = new AbortController();

    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productIds: stored.map((item) => item.productId),
      }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { products?: Array<Record<string, unknown>> } | null) => {
        if (!body?.products) return;

        const live: CartProductState[] = body.products.map((product) => ({
          productId: String(product.id),
          slug: String(product.slug),
          name: String(product.name),
          sku: String(product.sku),
          price: Number(product.price),
          image: typeof product.image === "string" ? product.image : null,
          stock: Number(product.stock),
        }));

        reconcile(live);
      })
      .catch(() => {
        // Offline, aborted, or a bad response. Keep what we have.
      });

    return () => controller.abort();
  }, [items, reconcile]);

  return null;
}
