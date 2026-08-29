import Link from "next/link";
import { Star } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn, compactNumber, discountPercent } from "@/lib/utils";

/* ---------------------------------------------------------------
   Button — renders as <button>, or <Link> when `href` is supplied.
   --------------------------------------------------------------- */

type Variant = "primary" | "accent" | "dark" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // `primary` and `accent` sit on saturated fills that are identical in both
  // themes, so their label stays literally white. `dark` and `outline` sit on
  // ink shades, which invert inside the admin panel's `.dark` scope — hence the
  // tokens. See the brand note in globals.css.
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  accent:
    "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm",
  dark: "bg-ink-900 text-ink-50 hover:bg-ink-800 active:bg-ink-950 shadow-sm",
  outline:
    "border border-ink-300 bg-surface text-ink-900 hover:border-ink-900 hover:bg-ink-50",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-full font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";

interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...rest
}: ButtonBaseProps & ComponentProps<"button">) {
  return (
    <button
      className={cn(
        BUTTON_BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...rest
}: ButtonBaseProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        BUTTON_BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------
   Badge
   --------------------------------------------------------------- */

const BADGE_TONES = {
  sale: "bg-accent-500 text-white",
  new: "bg-brand-600 text-white",
  neutral: "bg-white/90 text-ink-900 ring-1 ring-ink-200",
  muted: "bg-ink-100 text-ink-700",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------
   Price — re-exported so the ~8 existing `from "@/components/ui"`
   imports keep working. It now lives in its own client module
   because it reads the visitor's display currency from context, and
   this barrel is imported by Server Components too.
   --------------------------------------------------------------- */

export {
  Price,
  CurrencyAmount,
  CurrencyNotice,
} from "@/components/currency/price";

/* ---------------------------------------------------------------
   Star rating
   --------------------------------------------------------------- */

export function StarRating({
  rating,
  count,
  size = 14,
  showCount = true,
  className,
}: {
  rating: number;
  count?: number;
  size?: number;
  showCount?: boolean;
  className?: string;
}) {
  const rounded = Math.round(rating);

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Rated ${rating.toFixed(1)} out of 5${
        count ? ` from ${count} reviews` : ""
      }`}
    >
      <div className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            width={size}
            height={size}
            className={
              star <= rounded
                ? "fill-accent-400 text-accent-400"
                : "fill-ink-200 text-ink-200"
            }
          />
        ))}
      </div>
      {showCount && count !== undefined ? (
        <span className="text-xs text-ink-500">({compactNumber(count)})</span>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------
   Section heading — a title, optional subtitle and a "View all →" link.
   --------------------------------------------------------------- */

export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = "View all Products",
  align = "left",
  className,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 gap-4 sm:mb-8",
        align === "center"
          ? "flex flex-col items-center text-center"
          : "flex flex-wrap items-end justify-between",
        className,
      )}
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{subtitle}</p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 transition-colors hover:text-brand-700"
        >
          {linkLabel}
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------
   Discount badge helper
   --------------------------------------------------------------- */

export function SaleBadge({
  price,
  compareAtPrice,
}: {
  price: number;
  compareAtPrice?: number | null;
}) {
  const percent = discountPercent(price, compareAtPrice);
  if (!percent) return null;
  return <Badge tone="sale">Sale {percent}%</Badge>;
}

/* ---------------------------------------------------------------
   Skeletons — used as Suspense fallbacks so CLS stays at zero.
   --------------------------------------------------------------- */

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
      <div className="skeleton aspect-square w-full" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
   Empty state
   --------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-ink-300 bg-ink-50 px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-ink-400">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
