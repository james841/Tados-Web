import { z } from "zod";

import { handleRoute, jsonOk, parseBody, requireAdmin } from "@/lib/api";
import { UNSEEN_ORDER_WHERE } from "@/lib/order-alerts";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

/**
 * /api/admin/orders/unseen — the notification bell's data.
 *
 * GET returns the count plus a short preview list; POST marks orders as seen.
 * Split out from `/api/admin/orders` because the bell polls this every 30
 * seconds on every admin page, and it must stay a couple of indexed counts
 * rather than a paginated join.
 *
 * The path sits alongside the `[id]` dynamic segment. Next.js resolves a literal
 * segment before a dynamic one, so `/unseen` reaches this file and never the
 * order-detail route.
 */

/** How many orders the dropdown previews before deferring to the full list. */
const PREVIEW_LIMIT = 6;

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();

    const [count, rows] = await Promise.all([
      prisma.order.count({ where: UNSEEN_ORDER_WHERE }),
      prisma.order.findMany({
        where: UNSEEN_ORDER_WHERE,
        orderBy: { createdAt: "desc" },
        take: PREVIEW_LIMIT,
        select: {
          id: true,
          orderNumber: true,
          email: true,
          total: true,
          status: true,
          createdAt: true,
          user: { select: { name: true } },
          address: { select: { firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return jsonOk({
      count,
      orders: rows.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        // The address is the most reliable name: guest checkout has no user row.
        customer:
          (order.address
            ? `${order.address.firstName} ${order.address.lastName}`.trim()
            : null) ||
          order.user?.name?.trim() ||
          order.email,
        total: toNumber(order.total),
        status: order.status,
        createdAt: order.createdAt,
        itemCount: order._count.items,
      })),
    });
  });
}

const markSeenSchema = z.object({
  /** Omit to clear everything currently unseen. */
  orderIds: z.array(z.string().min(1)).max(200).optional(),
});

export async function POST(request: Request) {
  return handleRoute(async () => {
    const admin = await requireAdmin();
    const { orderIds } = await parseBody(request, markSeenSchema);

    const now = new Date();

    /**
     * `seenAt: null` stays in the filter even when specific ids are given.
     *
     * Without it, re-marking an order would overwrite the original timestamp
     * with today's — losing the only record of how long the order actually sat
     * unnoticed, which is the reason this is a timestamp and not a boolean.
     */
    const { count } = await prisma.order.updateMany({
      where: orderIds?.length
        ? { id: { in: orderIds }, seenAt: null }
        : UNSEEN_ORDER_WHERE,
      data: { seenAt: now },
    });

    if (count > 0) {
      console.info("[admin] orders marked seen", {
        by: admin.email,
        count,
      });
    }

    return jsonOk({ marked: count, seenAt: now });
  });
}
