import { HttpError, handleRoute, jsonOk, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  IS_EMAIL_CHECKOUT,
  MANUAL_PAYMENT_PROVIDER,
} from "@/lib/checkout-mode";
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  SITE,
} from "@/lib/constants";
import { sendOrderRequestEmails } from "@/lib/order-emails";
import { buildPaymentData, PAYFAST_PROCESS_URL } from "@/lib/payfast";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber, toNumber } from "@/lib/utils";
import { checkoutSchema } from "@/lib/validators";

/**
 * POST /api/checkout — turn a cart into a PENDING order and hand back whatever
 * the customer needs in order to pay for it.
 *
 * Two rules drive the whole handler:
 *
 *  1. Prices and stock come from the database, never from the request. The cart
 *     lives in localStorage, so anything it sends is attacker-controlled. The
 *     client only gets to say *which* products and *how many*.
 *
 *  2. Stock is decremented here, in the same transaction that writes the order.
 *     `/api/admin/orders/[id]` increments it back on CANCELLED/REFUNDED, so if
 *     this half were missing, cancelling an order would invent inventory.
 *
 * Everything above the last few lines is identical in both checkout modes, which
 * is the point: an order is an order regardless of how it gets paid for. Only the
 * final step differs, and it differs once — see `lib/checkout-mode.ts`.
 *
 * The order is left PENDING. Only a verified PayFast ITN promotes it to PAID —
 * see `/api/payfast/notify`.
 */

export async function POST(request: Request) {
  return handleRoute(async () => {
    const input = await parseBody(request, checkoutSchema);

    // Signed in is optional: `Order.userId` and `Address.userId` are both
    // nullable precisely so a guest can buy.
    //
    // The id is confirmed against the database rather than taken from the
    // session as-is. Sessions are JWTs, so the cookie keeps asserting a user id
    // for up to 30 days after that row stops existing — a reseed or a deleted
    // account is enough. Attaching it anyway violates the Address/Order foreign
    // key and fails the whole checkout; treating it as a guest completes the
    // sale, which is the outcome that matters to a shopper mid-purchase.
    const userId = await resolveUserId();

    // Collapse duplicate lines before touching the database — two entries for
    // the same product would otherwise decrement stock twice and bypass the
    // per-line stock check.
    const quantities = new Map<string, number>();
    for (const item of input.items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const products = await prisma.product.findMany({
      where: { id: { in: [...quantities.keys()] }, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        stock: true,
        images: {
          select: { url: true },
          orderBy: { position: "asc" },
          take: 1,
        },
      },
    });

    if (products.length !== quantities.size) {
      throw new HttpError(
        409,
        "Some items are no longer available. Please review your cart.",
      );
    }

    const lines = products.map((product) => {
      const quantity = quantities.get(product.id)!;

      if (product.stock < quantity) {
        throw new HttpError(
          409,
          product.stock === 0
            ? `${product.name} has sold out.`
            : `Only ${product.stock} of ${product.name} left in stock.`,
        );
      }

      const price = toNumber(product.price);

      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        image: product.images[0]?.url ?? null,
        price,
        quantity,
        lineTotal: price * quantity,
      };
    });

    // Totals are recomputed from database prices. Rounded to cents so the
    // amount we sign matches the amount PayFast echoes back in the ITN.
    const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
    const shipping =
      subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const total = round2(subtotal + shipping);

    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          userId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          line1: input.line1,
          line2: input.line2 ?? null,
          city: input.city,
          province: input.province,
          postalCode: input.postalCode,
        },
        select: { id: true },
      });

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          email: input.email.toLowerCase(),
          phone: input.phone,
          addressId: address.id,
          subtotal,
          shipping,
          // No tax is charged on top of the displayed price. The column stays so
          // the schema can carry tax later without a migration, but recording 0
          // keeps the stored total equal to what the customer was shown and what
          // PayFast will charge.
          tax: 0,
          discount: 0,
          total,
          status: "PENDING",
          notes: input.notes ?? null,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              name: line.name,
              sku: line.sku,
              image: line.image,
              price: line.price,
              quantity: line.quantity,
            })),
          },
          payment: {
            create: {
              // Which provider is owed the money. `manual` marks an order PayFast
              // never saw, so the admin panel, the success page and the dev-only
              // settlement helper can all tell the two kinds of PENDING apart.
              provider: IS_EMAIL_CHECKOUT
                ? MANUAL_PAYMENT_PROVIDER
                : "payfast",
              status: "PENDING",
              amount: total,
            },
          },
        },
        select: { id: true, orderNumber: true, total: true },
      });

      // Conditional decrement: `stock: { gte: quantity }` makes this a no-op if
      // another checkout took the last unit between the read above and here.
      // `updateMany` reports how many rows matched, so we can detect that race
      // and roll the whole transaction back rather than overselling.
      for (const line of lines) {
        const { count } = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });

        if (count === 0) {
          throw new HttpError(
            409,
            `${line.name} sold out while you were checking out.`,
          );
        }
      }

      return created;
    });

    // ── Email completion ────────────────────────────────────────────────
    // PayFast can't receive money until the merchant account is approved, so
    // the order is finished here instead: the shop is emailed to arrange
    // payment, the customer is emailed to say so, and the browser stays on the
    // site. Nothing below this block runs in email mode, which is why the
    // PayFast handoff needs no conditionals of its own.
    //
    // Awaited, not fired and forgotten: on a serverless host the function is
    // frozen the moment the response is returned, and a pending promise dies
    // with it. `sendOrderRequestEmails` resolves rather than throws, so a mail
    // failure can't 500 an order that has already taken stock — it's logged,
    // and the customer still lands on a page that tells them what happens next.
    if (IS_EMAIL_CHECKOUT) {
      await sendOrderRequestEmails(order.id);

      return jsonOk({
        mode: "email" as const,
        orderNumber: order.orderNumber,
        total,
      });
    }

    // `SITE.url` rather than the raw environment variable: it is the same value
    // with any trailing slash stripped, and PayFast's return, cancel and notify
    // URLs are built by concatenation — `${siteUrl}/checkout/success`.
    const siteUrl = SITE.url;

    const itemName =
      lines.length === 1
        ? lines[0].name
        : `${SITE.shortName} order — ${lines.length} items`;

    const paymentData = buildPaymentData({
      orderNumber: order.orderNumber,
      amount: total,
      itemName,
      itemDescription: lines
        .map((l) => `${l.quantity}x ${l.name}`)
        .join(", "),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      siteUrl,
    });

    return jsonOk({
      orderNumber: order.orderNumber,
      total,
      processUrl: PAYFAST_PROCESS_URL,
      paymentData,
    });
  });
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * The signed-in user's id, but only if that user still exists.
 *
 * One indexed lookup on a route that already runs a transaction — cheap next to
 * silently losing a sale to a foreign key error.
 */
async function resolveUserId() {
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  if (!existing) {
    console.warn(
      `[checkout] session names user ${user.id}, which is not in the database — continuing as a guest`,
    );
    return null;
  }

  return existing.id;
}
