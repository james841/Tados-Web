import type { Prisma } from "@prisma/client";

import {
  handleRoute,
  jsonOk,
  readPagination,
  requireAdmin,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

/** /api/admin/orders — paginated order list with search and status filter. */
export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const { page, perPage, skip, take } = readPagination(searchParams);

    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");

    const where: Prisma.OrderWhereInput = {
      // Only accept a status the enum actually has, so a junk query string
      // returns everything rather than throwing at the database.
      ...(status &&
      [
        "PENDING",
        "PAID",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
      ].includes(status)
        ? { status: status as Prisma.EnumOrderStatusFilter["equals"] }
        : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          orderNumber: true,
          email: true,
          total: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, name: true, image: true } },
          payment: { select: { status: true, provider: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return jsonOk({
      orders: rows.map((order) => ({
        ...order,
        total: toNumber(order.total),
        itemCount: order._count.items,
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
