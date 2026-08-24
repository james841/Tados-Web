"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X, SlidersHorizontal } from "lucide-react";
import { useState, useTransition } from "react";

import { useCurrency } from "@/components/currency/currency-provider";
import { SORT_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Catalogue filter sidebar.
 *
 * All filter state lives in the URL, not React state — that makes every
 * filtered view shareable, back-button friendly and server-rendered. Updates
 * are pushed inside a transition with `scroll: false`, so the grid re-renders
 * on the server without the page jumping or flashing.
 *
 * There is deliberately no brand filter. It was removed on the client's
 * instruction, and the catalogue is small enough that filtering by brand mostly
 * produced one- or two-product results — price and availability are the useful
 * axes here. `Brand` still exists on the product record and on the admin form;
 * it is simply not a shopper-facing facet.
 */
export function ProductFilters({
  priceRange,
  className,
}: {
  priceRange: { min: number; max: number };
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  // The price hints follow the visitor's display currency; the inputs stay in
  // rand because that's what the query filters on.
  const { format } = useCurrency();

  const onSale = searchParams.get("onSale") === "1";
  const inStock = searchParams.get("inStock") === "1";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const activeCount =
    (onSale ? 1 : 0) + (inStock ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  function applyParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    // Any filter change invalidates the current page number.
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function toggleFlag(key: "onSale" | "inStock", value: boolean) {
    applyParams((params) => {
      if (value) params.set(key, "1");
      else params.delete(key);
    });
  }

  function setPrice(key: "minPrice" | "maxPrice", value: string) {
    applyParams((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  function resetAll() {
    applyParams((params) => {
      ["onSale", "inStock", "minPrice", "maxPrice"].forEach((k) =>
        params.delete(k),
      );
    });
  }

  const panel = (
    <div
      className={cn(
        "space-y-7",
        isPending && "pointer-events-none opacity-60 transition-opacity",
      )}
    >
      {activeCount > 0 ? (
        <button
          type="button"
          onClick={resetAll}
          className="flex items-center gap-2 text-sm font-semibold text-ink-700 transition-colors hover:text-accent-600"
        >
          <X size={15} />
          Reset filters ({activeCount})
        </button>
      ) : null}

      <FilterGroup title="Price">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            defaultValue={minPrice ?? ""}
            placeholder={String(Math.floor(priceRange.min))}
            onBlur={(e) => setPrice("minPrice", e.target.value)}
            aria-label="Minimum price in rand"
            className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
          />
          <span className="text-ink-400">–</span>
          <input
            type="number"
            inputMode="numeric"
            defaultValue={maxPrice ?? ""}
            placeholder={String(Math.ceil(priceRange.max))}
            onBlur={(e) => setPrice("maxPrice", e.target.value)}
            aria-label="Maximum price in rand"
            className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
          />
        </div>
        <p className="mt-2 text-xs text-ink-500">
          In stock from {format(priceRange.min)} to {format(priceRange.max)}
        </p>
      </FilterGroup>

      <FilterGroup title="Availability">
        <div className="space-y-2.5">
          <Checkbox
            checked={onSale}
            onChange={(v) => toggleFlag("onSale", v)}
            label="On sale"
          />
          <Checkbox
            checked={inStock}
            onChange={(v) => toggleFlag("inStock", v)}
            label="In stock only"
          />
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-900 lg:hidden"
      >
        <SlidersHorizontal size={16} />
        Filters
        {activeCount > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-lg font-bold">Filters</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close filters"
                className="rounded-lg p-1 hover:bg-ink-100"
              >
                <X size={20} />
              </button>
            </div>
            {panel}
          </div>
        </div>
      ) : null}

      <aside className={cn("hidden lg:block", className)}>{panel}</aside>
    </>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details open className="group border-b border-ink-200 pb-5">
      <summary className="mb-3 flex cursor-pointer list-none items-center justify-between text-base font-bold text-ink-900">
        {title}
        <span className="text-xs text-ink-400 transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      {children}
    </details>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700 hover:text-ink-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
      />
      {label}
    </label>
  );
}

/** Sort dropdown — also URL-driven so the server does the sorting. */
export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = searchParams.get("sort") ?? "newest";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink-500">Sort:</span>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="rounded-full border border-ink-300 px-3.5 py-2 text-sm font-medium outline-none focus:border-brand-600"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
