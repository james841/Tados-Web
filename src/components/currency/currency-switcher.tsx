"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

import { useCurrency } from "@/components/currency/currency-provider";
import {
  CURRENCIES,
  CURRENCY_COOKIE,
  CURRENCY_LABELS,
} from "@/lib/currency-shared";
import { cn } from "@/lib/utils";

/**
 * Manual override for the auto-detected currency.
 *
 * Geo-detection is right most of the time and wrong in ways the visitor can see
 * — a VPN, a corporate proxy, a South African travelling. Without an override
 * those people are stuck, so this writes a cookie the server reads on the next
 * render and prefers over the detected country.
 *
 * The cookie is set here rather than through an API route because it carries no
 * secret and needs no validation the server doesn't already do: `resolveCurrency`
 * ignores any value that isn't a supported code with a live rate.
 */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, available } = useCurrency();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function choose(code: string) {
    // A year is long enough to feel sticky; SameSite=Lax so it survives normal
    // navigation without riding along on cross-site requests.
    document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    // The price is rendered from a server prop, so the tree has to re-render on
    // the server for the new cookie to take effect.
    startTransition(() => router.refresh());
  }

  if (available.length < 2) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency: ${currency.code}. Change currency`}
        className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:opacity-60"
      >
        <Globe size={16} />
        <span>{currency.code}</span>
        <ChevronDown
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <>
          {/* Click-away layer. Sits under the menu but over everything else. */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label="Select currency"
            className="absolute right-0 z-50 mt-1 max-h-72 w-44 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1 shadow-xl"
          >
            {available.map((code) => {
              const active = code === currency.code;
              return (
                <li key={code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => choose(code)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      active
                        ? "bg-ink-100 text-ink-900"
                        : "text-ink-700 hover:bg-ink-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm",
                          active && "font-semibold",
                        )}
                      >
                        {CURRENCIES[code].symbol} {code}
                      </span>
                      <span className="block truncate text-[11px] text-ink-500">
                        {CURRENCY_LABELS[code]}
                      </span>
                    </span>
                    {active ? (
                      <Check size={14} className="shrink-0" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
