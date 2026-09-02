import "server-only";

import { sendOrderEmails } from "@/lib/order-emails";
import { prisma } from "@/lib/prisma";
import { IS_SANDBOX } from "@/lib/payfast";

/**
 * Development-only order confirmation.
 *
 * PayFast cannot POST an ITN to `localhost`, so on a dev machine an order would
 * sit at PENDING forever and you could never exercise the admin side of the
 * flow. This lets `/checkout/success` settle the order directly.
 *
 * The gate is deliberately paranoid, because this function is a payment bypass
 * by construction:
 *
 *   - `NODE_ENV !== "production"` — a production build can never reach it, and
 *     the check is inlined at build time so the body is dead code there.
 *   - `IS_SANDBOX`               — even in dev, live PayFast credentials disarm it.
 *
 * Do not loosen either condition, and do not call this from an API route. The
 * real settlement path is `/api/payfast/notify`; this exists only so you can
 * see an order reach the dashboard without standing up a tunnel.
 */
export function devSettlementAllowed() {
  return process.env.NODE_ENV !== "production" && IS_SANDBOX;
}

export async function devConfirmOrder(orderNumber: string) {
  if (!devSettlementAllowed()) return false;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      status: true,
      total: true,
      payment: { select: { status: true } },
    },
  });

  if (!order) return false;
  // Never re-settle: mirrors the ITN's idempotency guard.
  if (order.payment?.status === "COMPLETE") return false;
  if (order.status !== "PENDING") return false;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    }),
    prisma.payment.update({
      where: { orderId: order.id },
      data: {
        status: "COMPLETE",
        pfPaymentId: `DEV-${Date.now()}`,
        rawPayload: { source: "dev-fallback", note: "Settled locally — no ITN." },
      },
    }),
  ]);

  console.warn(
    `[dev] order ${orderNumber} settled without an ITN. Sandbox + development only.`,
  );

  /**
   * The same two emails the real ITN sends.
   *
   * Without this there is no way to see either template on a dev machine short
   * of tunnelling PayFast's callback to localhost — and an email nobody can
   * preview is an email that breaks quietly. Guarded by the same idempotency
   * checks above, so re-visiting /checkout/success does not re-send.
   */
  await sendOrderEmails(order.id);

  return true;
}
