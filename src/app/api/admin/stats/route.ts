import { handleRoute, jsonOk, requireAdmin } from "@/lib/api";
import { isUnseenOrder } from "@/lib/order-alerts";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

/**
 * /api/admin/stats — dashboard overview.
 *
 * Every figure is paired with the equivalent figure from the immediately
 * preceding window of the same length, which is what makes the deltas
 * meaningful: today is compared with yesterday, 30d with the 30d before it.
 *
 * Revenue counts only orders that were actually paid for — pending and
 * cancelled orders would otherwise inflate the number.
 *
 * The queries are grouped into a few `Promise.all` batches rather than one
 * giant array: a single batch this wide exceeds TypeScript's inference limit
 * for tuple types and silently degrades every result to `any`.
 */

const REVENUE_STATUSES = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

/** Percentage change, guarding the divide-by-zero of a cold start. */
function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();

    const range = new URL(request.url).searchParams.get("range") ?? "today";
    const days = range === "30d" ? 30 : range === "7d" ? 7 : 1;

    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    // Same length again, immediately before `start`.
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - days);

    const paidInWindow = {
      status: { in: [...REVENUE_STATUSES] },
      createdAt: { gte: start },
    };
    const paidInPreviousWindow = {
      status: { in: [...REVENUE_STATUSES] },
      createdAt: { gte: previousStart, lt: start },
    };

    const [revenueNow, revenuePrev] = await Promise.all([
      prisma.order.aggregate({ where: paidInWindow, _sum: { total: true } }),
      prisma.order.aggregate({
        where: paidInPreviousWindow,
        _sum: { total: true },
      }),
    ]);

    const [ordersNow, ordersPrev, returnsNow, returnsPrev] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: start } } }),
      prisma.order.count({
        where: { createdAt: { gte: previousStart, lt: start } },
      }),
      prisma.order.count({
        where: { status: "REFUNDED", createdAt: { gte: start } },
      }),
      prisma.order.count({
        where: {
          status: "REFUNDED",
          createdAt: { gte: previousStart, lt: start },
        },
      }),
    ]);

    /**
     * Customers.
     *
     * `customersNow` counts sign-ups *inside* the window so the card responds to
     * the range picker like every other KPI — it previously ran an unfiltered
     * `count()`, which returned the same lifetime figure for Today, 7d and 30d
     * and looked like the stat was broken.
     *
     * `customerTotal` is still the lifetime figure, kept because "new this week"
     * and "how many altogether" are both things a shopkeeper wants, and the
     * windowed number on its own would read as a collapse in the customer base.
     */
    const [customersNow, customersPrev, customerTotal] = await Promise.all([
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: start } },
      }),
      prisma.user.count({
        where: {
          role: "CUSTOMER",
          createdAt: { gte: previousStart, lt: start },
        },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);

    const lowStockCount = await prisma.product.count({
      where: {
        isActive: true,
        // Threshold is per-product, so compare the two columns directly.
        stock: { lte: prisma.product.fields.lowStockAt },
      },
    });

    const [recentOrders, topProducts] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          email: true,
          total: true,
          status: true,
          seenAt: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ["productId", "name"],
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 4,
      }),
    ]);

    // One row per day of the window, summed in-database. Parameterised, so the
    // status list and start date can never be injected into the SQL text.
    const trendRows = await prisma.$queryRaw<
      Array<{ day: Date; total: number }>
    >`
      SELECT date_trunc('day', "createdAt") AS day,
             COALESCE(SUM("total"), 0)::float8 AS total
      FROM "Order"
      WHERE "createdAt" >= ${start}
        AND "status"::text = ANY(${[...REVENUE_STATUSES]})
      GROUP BY day
      ORDER BY day ASC
    `;

    // Attach a thumbnail and category to the bestsellers — groupBy can't join.
    const decorated = await prisma.product.findMany({
      where: { id: { in: topProducts.map((row) => row.productId) } },
      select: {
        id: true,
        slug: true,
        category: { select: { name: true } },
        images: {
          select: { url: true },
          orderBy: { position: "asc" },
          take: 1,
        },
      },
    });
    const detailById = new Map(decorated.map((row) => [row.id, row]));

    const revenue = toNumber(revenueNow._sum.total);
    const revenuePrevious = toNumber(revenuePrev._sum.total);

    return jsonOk({
      range,
      kpis: {
        revenue: { value: revenue, delta: delta(revenue, revenuePrevious) },
        orders: { value: ordersNow, delta: delta(ordersNow, ordersPrev) },
        returns: { value: returnsNow, delta: delta(returnsNow, returnsPrev) },
        customers: {
          value: customersNow,
          delta: delta(customersNow, customersPrev),
          total: customerTotal,
        },
        lowStock: { value: lowStockCount, delta: 0 },
      },
      trend: trendRows.map((row) => ({
        day: row.day,
        total: Number(row.total),
      })),
      topProducts: topProducts.map((row) => {
        const detail = detailById.get(row.productId);
        return {
          id: row.productId,
          name: row.name,
          slug: detail?.slug ?? null,
          category: detail?.category.name ?? null,
          image: detail?.images[0]?.url ?? null,
          unitsSold: row._sum.quantity ?? 0,
          revenue: toNumber(row._sum.price),
        };
      }),
      recentOrders: recentOrders.map((order) => ({
        ...order,
        total: toNumber(order.total),
        // The same flag the orders table uses, so an unread order is marked on
        // the dashboard too — that's the screen an admin actually lands on.
        isNew: isUnseenOrder(order),
      })),
    });
  });
}
