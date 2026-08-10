import { HttpError, handleRoute, jsonOk, parseBody, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { orderStatusSchema } from "@/lib/validators";

/**
 * /api/admin/orders/[id] — full order detail, and status transitions.
 *
 * Cancelling or refunding returns the reserved units to stock, and does so in
 * the same transaction as the status write: a partial success here would leave
 * the catalogue lying about availability.
 */

type Params = { params: Promise<{ id: string }> };

/** Statuses where the customer no longer holds the stock. */
const RESTOCKING_STATUSES = new Set(["CANCELLED", "REFUNDED"]);

export async function GET(_request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        address: true,
        payment: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!order) throw new HttpError(404, "Order not found.");

    return jsonOk({
      ...order,
      subtotal: toNumber(order.subtotal),
      shipping: toNumber(order.shipping),
      tax: toNumber(order.tax),
      discount: toNumber(order.discount),
      total: toNumber(order.total),
      items: order.items.map((item) => ({
        ...item,
        price: toNumber(item.price),
      })),
      payment: order.payment
        ? { ...order.payment, amount: toNumber(order.payment.amount) }
        : null,
    });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;

    const { status } = await parseBody(request, orderStatusSchema);

    const existing = await prisma.order.findUnique({
      where: { id },
      select: {
        status: true,
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (!existing) throw new HttpError(404, "Order not found.");

    // Only restock on the transition *into* a cancelled/refunded state —
    // re-saving an already-cancelled order must not credit stock twice.
    const shouldRestock =
      RESTOCKING_STATUSES.has(status) &&
      !RESTOCKING_STATUSES.has(existing.status);

    const order = await prisma.$transaction(async (tx) => {
      if (shouldRestock) {
        await Promise.all(
          existing.items.map((item) =>
            tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            }),
          ),
        );
      }

      return tx.order.update({
        where: { id },
        data: { status },
        select: { id: true, orderNumber: true, status: true },
      });
    });

    return jsonOk({ ...order, restocked: shouldRestock });
  });
}
