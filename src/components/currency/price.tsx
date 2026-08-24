"use client";

import { useCurrency } from "@/components/currency/currency-provider";
import { cn } from "@/lib/utils";

/**
 * A product price, in the visitor's currency.
 *
 * Two rules drive the layout:
 *
 * 1. A South African visitor sees exactly what they saw before — one rand
 *    figure, no extra text. That's the overwhelming majority of traffic and it
 *    shouldn't pay for a feature aimed at everyone else.
 * 2. A converted price never appears on its own. The store charges in rand
 *    through PayFast, so the rand figure is the real price and the conversion is
 *    an indication. Showing "$71" with no "R1 299" beside it would be a price
 *    the customer can't be charged — and under the CPA a displayed price is
 *    something you're expected to honour.
 */

const SIZES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl sm:text-4xl",
} as const;

const BASE_SIZES = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-xs",
  xl: "text-sm",
} as const;

export function Price({
  price,
  compareAtPrice,
  size = "md",
  className,
  showBase = true,
}: {
  price: number;
  compareAtPrice?: number | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Set false where the rand amount is already stated nearby, e.g. a checkout total. */
  showBase?: boolean;
}) {
  const { format, formatBase, isConverted } = useCurrency();
  const onSale = compareAtPrice != null && compareAtPrice > price;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-bold text-ink-900", SIZES[size])}>
        {format(price)}
      </span>

      {onSale ? (
        <span
          className={cn(
            "text-ink-400 line-through",
            size === "xl" ? "text-lg" : "text-xs",
          )}
        >
          {format(compareAtPrice)}
        </span>
      ) : null}

      {isConverted && showBase ? (
        <span
          className={cn("whitespace-nowrap text-ink-500", BASE_SIZES[size])}
          // "≈" is decorative here; the title carries the meaning for anyone
          // who can't infer it from the glyph.
          title={`Charged in South African rand: ${formatBase(price)}`}
        >
          ≈ {formatBase(price)}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A price in the display currency with no rand fallback and no wrapper.
 *
 * For inline use inside a sentence or a table cell that already sits next to a
 * rand total. Everything customer-facing that stands alone should use `Price`.
 */
export function CurrencyAmount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const { format } = useCurrency();
  return <span className={className}>{format(value)}</span>;
}

/**
 * The "prices shown are an estimate" line.
 *
 * Renders nothing for rand visitors, so it can be dropped into any page without
 * a conditional at the call site.
 */
export function CurrencyNotice({ className }: { className?: string }) {
  const { currency, isConverted } = useCurrency();
  if (!isConverted) return null;

  return (
    <p className={cn("text-xs text-ink-500", className)}>
      Prices are shown in {currency.code} as a guide, converted at today&apos;s
      rate. Your order is charged in South African rand (ZAR).
    </p>
  );
}
