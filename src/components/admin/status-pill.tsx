import { cn } from "@/lib/utils";

/**
 * Order status badge, shared by the dashboard and the orders table.
 *
 * Lives outside `page.tsx` because the App Router only permits a specific set
 * of named exports from a page module.
 */

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-ink-200 text-ink-700",
  REFUNDED: "bg-red-100 text-red-800",
};

export function OrderStatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        STATUS_STYLES[status] ?? "bg-ink-100 text-ink-700",
      )}
    >
      {status}
    </span>
  );
}
