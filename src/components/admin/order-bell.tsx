"use client";

import { Bell, PackagePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn, formatPrice } from "@/lib/utils";

/**
 * Unread-order notifications for the admin shell.
 *
 * Lives in the sidebar's logo row — the only row that renders in both the
 * desktop column and the mobile bar — so the count is reachable on a phone.
 *
 * Polls rather than subscribes. A websocket or SSE channel would be lower
 * latency, but it would also need a connection held open per admin tab through
 * Vercel's function timeouts; a 30-second poll of two indexed counts is the
 * proportionate answer for a shop with a handful of staff.
 */

type UnseenOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
};

const POLL_INTERVAL_MS = 30_000;
const PANEL_WIDTH = 320;
const VIEWPORT_MARGIN = 12;

export function AdminOrderBell() {
  const pathname = usePathname();

  const [count, setCount] = useState<number | null>(null);
  const [orders, setOrders] = useState<UnseenOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders/unseen", {
        // The count is the whole point — a cached response would show a stale
        // number for as long as the browser felt like it.
        cache: "no-store",
      });
      if (!res.ok) return;

      const body = await res.json();
      setCount(body.count ?? 0);
      setOrders(body.orders ?? []);
    } catch {
      // A dropped poll is not worth surfacing: the next one is 30 seconds away,
      // and an error banner on the sidebar would outlive the problem.
    }
  }, []);

  /**
   * Refetch on every admin navigation as well as on the timer.
   *
   * Opening an order marks it seen server-side, so without this the badge would
   * keep claiming there's one unread until the next tick — the admin would watch
   * a number they'd just dealt with sit there and stop believing it.
   */
  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    // Polling a hidden tab burns a request every 30s to update a badge nobody is
    // looking at. Catching up on `visibilitychange` covers the gap.
    const tick = () => {
      if (!document.hidden) void load();
    };

    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [load]);

  // Dismissal: Escape, a click outside, or the page scrolling out from under an
  // element that is positioned in viewport coordinates.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onScrollOrResize = () => setOpen(false);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    /**
     * Measured viewport coordinates, and `position: fixed`.
     *
     * The sidebar is `overflow-x-auto` on mobile, and a container that scrolls on
     * one axis clips the other too — an absolutely-positioned panel would be cut
     * off at the bar's bottom edge on exactly the devices where the bell matters
     * most. Fixed positioning escapes the clip; the clamp keeps the panel on
     * screen when the button sits near an edge.
     */
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.left),
        window.innerWidth - width - VIEWPORT_MARGIN,
      );
      setCoords({ top: rect.bottom + 8, left });
    }

    setOpen(true);
    void load();
  }

  async function markAllSeen() {
    setClearing(true);

    // Optimistic: the badge should go quiet the instant it's dismissed, not a
    // round trip later. `load()` in the finally block reconciles either way.
    setCount(0);
    setOrders([]);

    try {
      await fetch("/api/admin/orders/unseen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // Ignored — the refetch below restores the true count if this failed.
    } finally {
      setClearing(false);
      setOpen(false);
      void load();
    }
  }

  const hasUnseen = (count ?? 0) > 0;
  const panelWidth = Math.min(
    PANEL_WIDTH,
    typeof window === "undefined"
      ? PANEL_WIDTH
      : window.innerWidth - VIEWPORT_MARGIN * 2,
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          hasUnseen
            ? `Notifications — ${count} new order${count === 1 ? "" : "s"}`
            : "Notifications — nothing new"
        }
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          "text-ink-500 hover:bg-ink-100 hover:text-ink-900",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
          open && "bg-ink-100 text-ink-900",
        )}
      >
        <Bell size={17} />

        {hasUnseen ? (
          <span
            // The one animated element in the admin chrome. Same keyframe as the
            // "New" pill in the orders table, so the two read as one signal.
            className={cn(
              "absolute -right-0.5 -top-0.5 flex min-w-[17px] items-center justify-center",
              "rounded-full bg-accent-600 px-1 text-[10px] font-bold leading-[17px] text-white",
              "animate-alert-ring motion-reduce:animate-none",
            )}
          >
            {count! > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {/* Announced rather than only shown, so an order arriving while the admin
          is on another page still reaches a screen reader. */}
      <span aria-live="polite" className="sr-only">
        {hasUnseen
          ? `${count} new order${count === 1 ? "" : "s"} waiting`
          : ""}
      </span>

      {open && coords ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="New orders"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: panelWidth,
          }}
          className="z-50 overflow-hidden rounded-card border border-ink-200 bg-surface shadow-md"
        >
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
              {hasUnseen
                ? `${count} new order${count === 1 ? "" : "s"}`
                : "New orders"}
            </p>
            {hasUnseen ? (
              <button
                type="button"
                onClick={markAllSeen}
                disabled={clearing}
                className="text-xs font-semibold text-brand-700 transition-opacity hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {orders.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <PackagePlus
                size={20}
                className="mx-auto text-ink-300"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm text-ink-500">You&apos;re all caught up.</p>
              <p className="mt-1 text-xs text-ink-400">
                New paid orders show up here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[320px] divide-y divide-ink-100 overflow-y-auto">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition-colors hover:bg-ink-50"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-ink-900">
                        {order.orderNumber}
                      </span>
                      <span className="shrink-0 text-[11px] text-ink-400">
                        {timeAgo(order.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-xs text-ink-500">
                        {order.customer}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-700">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-ink-200 px-4 py-2.5">
            <Link
              href="/admin/orders"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-ink-600 transition-colors hover:text-ink-900"
            >
              View all orders →
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Coarse relative time.
 *
 * Deliberately not `Intl.RelativeTimeFormat` with live seconds: the list is
 * refetched every 30 seconds, so anything finer would be wrong between polls.
 */
function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
