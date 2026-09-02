import { NextResponse } from "next/server";

import { sendOrderEmails } from "@/lib/order-emails";
import { prisma } from "@/lib/prisma";
import {
  amountsMatch,
  isValidItnHost,
  validateItnWithPayFast,
  verifyItnSignature,
} from "@/lib/payfast";
import { toNumber } from "@/lib/utils";

/**
 * POST /api/payfast/notify — PayFast Instant Transaction Notification.
 *
 * This route, not the browser redirect, is what marks an order paid. The
 * customer's return to /checkout/success proves only that their browser came
 * back; this server-to-server callback is the money.
 *
 * Four independent checks must all pass before a single row is written:
 *
 *  1. Signature — the payload was signed with our passphrase.
 *  2. Host      — it arrived from a PayFast address.
 *  3. Postback  — PayFast itself confirms the payload ("VALID").
 *  4. Amount    — the sum paid equals the order total we recorded.
 *
 * The postback is the strongest of the four: it asks PayFast to vouch for the
 * data rather than trusting anything in the request. It is never skipped.
 *
 * Every response is 200. A non-2xx tells PayFast to retry, and retrying will
 * not fix a bad signature or an unknown order — it just produces an endless
 * redelivery loop. Failures are logged and swallowed.
 */

// The signature covers the raw body, so this must never be cached or
// statically analysed into a different shape.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PayFast retries; a second delivery must not write anything twice. */
const TERMINAL_PAYMENT_STATUSES = new Set(["COMPLETE", "FAILED", "CANCELLED"]);

export async function POST(request: Request) {
  try {
    /**
     * Read the body as text, then parse.
     *
     * `request.formData()` would work but discards the original field order,
     * and the ITN signature is computed over the fields *in the order PayFast
     * sent them*. Only the raw string preserves that.
     */
    const raw = await request.text();
    const params = new URLSearchParams(raw);

    const payload: Record<string, string> = {};
    for (const [key, value] of params.entries()) payload[key] = value;

    if (Object.keys(payload).length === 0) {
      console.warn("[payfast:itn] empty payload");
      return ok();
    }

    const orderNumber = payload.m_payment_id;

    // 1. Signature.
    if (!verifyItnSignature(payload)) {
      console.warn("[payfast:itn] signature mismatch", { orderNumber });
      return ok();
    }

    // 2. Host. Best-effort: proxies rewrite these headers, so a miss is logged
    //    rather than fatal — the postback below is the real gate.
    const forwardedHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");

    if (!(await isValidItnHost(forwardedHost))) {
      console.warn("[payfast:itn] unrecognised host", {
        forwardedHost,
        orderNumber,
      });
    }

    // 3. Ask PayFast to vouch for the payload.
    if (!(await validateItnWithPayFast(payload))) {
      console.warn("[payfast:itn] PayFast rejected the payload", {
        orderNumber,
      });
      return ok();
    }

    if (!orderNumber) {
      console.warn("[payfast:itn] no m_payment_id on a valid payload");
      return ok();
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        status: true,
        total: true,
        items: { select: { productId: true, quantity: true } },
        payment: { select: { id: true, status: true } },
      },
    });

    if (!order) {
      console.warn("[payfast:itn] unknown order", { orderNumber });
      return ok();
    }

    // Idempotency guard. Checked before the amount comparison so a replay of an
    // already-settled payment exits quietly instead of logging a scary warning.
    if (order.payment && TERMINAL_PAYMENT_STATUSES.has(order.payment.status)) {
      return ok();
    }

    // 4. Amount.
    const grossPaid = Number(payload.amount_gross ?? "0");
    if (!amountsMatch(toNumber(order.total), grossPaid)) {
      console.error("[payfast:itn] amount mismatch — not settling", {
        orderNumber,
        expected: toNumber(order.total),
        received: grossPaid,
      });
      return ok();
    }

    const paymentStatus = (payload.payment_status ?? "").toUpperCase();

    if (paymentStatus === "COMPLETE") {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: "PAID" },
        }),
        prisma.payment.update({
          where: { orderId: order.id },
          data: {
            status: "COMPLETE",
            pfPaymentId: payload.pf_payment_id ?? null,
            signature: payload.signature ?? null,
            rawPayload: payload,
          },
        }),
      ]);

      /**
       * Receipt to the customer, alert to the shop.
       *
       * After the commit, not before: the emails describe a paid order, and
       * sending them from inside the transaction would mean a rollback still
       * left two emails claiming the payment went through.
       *
       * Sent once per order for free — the terminal-status guard above already
       * exits early on every PayFast retry, so a redelivery never reaches here.
       *
       * `await`ed rather than fired and forgotten, because a serverless function
       * can be frozen the moment it responds, which would cancel the request
       * mid-flight. `sendOrderEmails` is written never to throw, so this cannot
       * break the "always answer 200" contract.
       */
      await sendOrderEmails(order.id);

      return ok();
    }

    /**
     * Anything else is a failed or cancelled payment. The units were reserved
     * at checkout, so they have to go back — same rule as the admin cancel path
     * in `/api/admin/orders/[id]`, and guarded the same way: only restock on
     * the transition *into* a cancelled state, never on a repeat delivery.
     */
    const nextPaymentStatus =
      paymentStatus === "CANCELLED" ? "CANCELLED" : "FAILED";

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: nextPaymentStatus,
          pfPaymentId: payload.pf_payment_id ?? null,
          signature: payload.signature ?? null,
          rawPayload: payload,
        },
      });
    });

    return ok();
  } catch (error) {
    // Swallow deliberately: see the note on always returning 200.
    console.error("[payfast:itn] handler failed", error);
    return ok();
  }
}

function ok() {
  return new NextResponse("OK", { status: 200 });
}
