import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional classes and let later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const zarFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

/** Format a rand amount. Accepts Prisma Decimal, string, or number. */
export function formatPrice(value: number | string | { toString(): string }) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(amount)) return zarFormatter.format(0);
  return zarFormatter.format(amount);
}

/** Prisma Decimal -> number, safe for passing to client components. */
export function toNumber(value: number | string | { toString(): string } | null | undefined) {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

/**
 * "Smart Door Lock" -> "smart-door-lock", "Café Ø 21" -> "cafe-o-21".
 *
 * Accents are folded to their base letters rather than stripped, so a product
 * named in any Latin script still produces a readable URL instead of losing
 * half its characters. Returns "" when there is nothing left to work with —
 * callers are expected to have a fallback, because a name written entirely in a
 * non-Latin script is a legitimate name, not an error.
 */
export function slugify(input: string) {
  return input
    .normalize("NFKD")
    // The combining-marks block, left behind by NFKD once "é" has been split
    // into "e" + accent.
    .replace(/[̀-ͯ]/g, "")
    // Letters NFKD can't decompose, because the stroke is part of the glyph.
    .replace(/[øØ]/g, "o")
    .replace(/[æÆ]/g, "ae")
    .replace(/[đĐ]/g, "d")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .trim()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Percentage saved, for the "SALE 25%" badges. */
export function discountPercent(
  price: number,
  compareAtPrice?: number | null,
): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/**
 * The shop's wall clock.
 *
 * Pinned rather than left to the runtime, because these formatters run in three
 * places with three different zones: the customer's browser, the admin's
 * browser, and a Vercel function (UTC). Unpinned, an order placed at 14:32 in
 * Johannesburg prints "12:32" on the receipt the server renders and "14:32" on
 * the order page the browser renders — the same order, two times, and a support
 * conversation about which one is real. Every customer, courier and staff member
 * this store deals with is on SAST, so SAST is what gets shown.
 */
const SHOP_TIME_ZONE = "Africa/Johannesburg";

/** ORD-20260805-4821 */
export function generateOrderNumber() {
  // Also in shop time: on a UTC server, an order placed at 01:30 SAST would
  // otherwise be stamped with the previous day's date, so the day's orders
  // wouldn't group under the day the shop actually took them.
  const stamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");

  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${stamp}-${random}`;
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: SHOP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: SHOP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** "1.2K reviews" style compaction used on product cards. */
export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-ZA", { notation: "compact" }).format(value);
}

export function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Build a querystring while dropping empty values — keeps URLs canonical. */
export function buildQuery(params: Record<string, string | number | undefined | null | string[]>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((v) => search.append(key, v));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;
