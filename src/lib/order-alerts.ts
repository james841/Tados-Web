import type { Prisma } from "@prisma/client";

/**
 * What counts as a new order the admin hasn't dealt with.
 *
 * One definition, imported by the bell count, the orders list and the
 * mark-as-read endpoint. If these ever drifted apart the badge would show a
 * number that doesn't match the rows highlighted underneath it — the exact bug
 * that teaches an admin to stop trusting the badge.
 */

/**
 * Statuses that never raise an alert.
 *
 * `PENDING` is a checkout that started and may never finish. Counting those
 * would light the bell for every abandoned cart, and a notification that's
 * usually noise gets ignored within a week — which is worse than no
 * notification, because it also hides the real ones.
 *
 * `CANCELLED` covers a failed or abandoned payment. Nothing to pack, nothing to
 * chase, so it stays quiet. It's excluded from the highlight as well as the
 * count, so a cancelled order never sits in the table wearing a "New" pill that
 * the badge doesn't account for.
 */
const NON_ALERTING_STATUSES = ["PENDING", "CANCELLED"] as const;

/** The `where` fragment for "unseen, and worth telling someone about". */
export const UNSEEN_ORDER_WHERE = {
  seenAt: null,
  status: { notIn: [...NON_ALERTING_STATUSES] },
} satisfies Prisma.OrderWhereInput;

/**
 * The same test in TypeScript, for rows already loaded.
 *
 * Pure and dependency-free so it can run on either side of the network boundary
 * — the orders API uses it to stamp `isNew` on each row it returns.
 */
export function isUnseenOrder(order: {
  seenAt: Date | string | null;
  status: string;
}) {
  if (order.seenAt !== null) return false;
  return !(NON_ALERTING_STATUSES as readonly string[]).includes(order.status);
}
