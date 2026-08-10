import type { Prisma } from "@prisma/client";

import { handleRoute, jsonOk, readPagination, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

/**
 * /api/admin/customers — customer list with lifetime spend.
 *
 * Spend is aggregated in a single grouped query keyed by user, rather than a
 * per-row total, so the list stays one round-trip regardless of page size.
 * Only orders that were actually paid for count toward the total.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const { page, perPage, skip, take } = readPagination(searchParams);
    const q = searchParams.get("q")?.trim();

    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          phone: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const spendByUser = await prisma.order.groupBy({
      by: ["userId"],
      where: {
        userId: { in: rows.map((row) => row.id) },
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      _sum: { total: true },
    });

    const spendMap = new Map(
      spendByUser.map((row) => [row.userId, toNumber(row._sum.total)]),
    );

    return jsonOk({
      customers: rows.map((row) => ({
        ...row,
        orderCount: row._count.orders,
        totalSpent: spendMap.get(row.id) ?? 0,
      })),
      pagination: {
        page,
        perPage,
        total,
        pages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  });
}
