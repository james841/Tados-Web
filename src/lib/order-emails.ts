import { SITE } from "@/lib/constants";
import { getAdminOrderRecipients, sendEmail, type SendEmailResult } from "@/lib/email";
import {
  buildAdminEmail,
  buildCustomerEmail,
  type OrderForEmail,
} from "@/lib/order-email-templates";
import {
  buildAdminRequestEmail,
  buildCustomerRequestEmail,
} from "@/lib/order-request-email-templates";
import { prisma } from "@/lib/prisma";

/**
 * The two emails an order produces: a receipt for the customer and an alert for
 * whoever has to pack it.
 *
 * Both are built from one database read and sent from one place, because the
 * failure mode that matters is asymmetric — a customer receipt that sends while
 * the admin alert silently doesn't means a paid order nobody knows about.
 *
 * `sendOrderEmails` is the paid pair, sent from the PayFast ITN handler.
 * `sendOrderRequestEmails` is the awaiting-payment pair, sent from `/api/checkout`
 * while PayFast is unapproved — see `lib/checkout-mode.ts`. The two are kept as
 * separate functions rather than one with a flag: the first runs on the payment
 * path and is deliberately left alone.
 *
 * The templates themselves live in `order-email-templates.ts` and
 * `order-request-email-templates.ts` so they can be rendered without a database
 * connection.
 */

/**
 * The order, with exactly the fields the templates ask for.
 *
 * The return type is annotated rather than inferred, so if a field is ever
 * dropped from the `select` the build fails here instead of the receipt going out
 * with a blank line in it.
 */
async function loadOrderForEmail(
  orderId: string,
): Promise<OrderForEmail | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      phone: true,
      status: true,
      notes: true,
      subtotal: true,
      shipping: true,
      tax: true,
      discount: true,
      total: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, email: true } },
      address: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          line1: true,
          line2: true,
          city: true,
          province: true,
          postalCode: true,
          country: true,
        },
      },
      items: {
        select: { id: true, name: true, sku: true, price: true, quantity: true },
      },
      payment: {
        select: { provider: true, status: true, pfPaymentId: true, amount: true },
      },
    },
  });
}

export type OrderEmailOutcome = {
  customer: SendEmailResult;
  admin: SendEmailResult;
};

/**
 * Send both order emails. Resolves rather than rejects, always.
 *
 * Called from the PayFast ITN handler, which must answer 200 to every request or
 * PayFast retries the notification indefinitely. A thrown error here would turn a
 * delivery problem into a payment-reconciliation problem, so there is nothing
 * this function is allowed to throw.
 */
export async function sendOrderEmails(
  orderId: string,
): Promise<OrderEmailOutcome> {
  const failed = (detail: string): SendEmailResult => ({
    ok: false,
    reason: "failed",
    detail,
  });

  let order: OrderForEmail | null = null;

  try {
    order = await loadOrderForEmail(orderId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[order-emails] could not load order", { orderId, detail });
    return { customer: failed(detail), admin: failed(detail) };
  }

  if (!order) {
    console.error("[order-emails] order not found", { orderId });
    return {
      customer: failed("order not found"),
      admin: failed("order not found"),
    };
  }

  const customerEmail = buildCustomerEmail(order);
  const adminEmail = buildAdminEmail(order);

  // Sent in parallel and settled independently: the customer's receipt should
  // not be held up by a bad admin address, and vice versa.
  const [customer, admin] = await Promise.all([
    sendEmail({
      to: order.email,
      subject: customerEmail.subject,
      html: customerEmail.html,
      text: customerEmail.text,
    }),
    sendEmail({
      to: getAdminOrderRecipients(),
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
      // Replying to the alert should reach the customer, not the shop's own
      // inbox — it's the fastest path to "we're missing a delivery detail".
      replyTo: order.email,
    }),
  ]);

  if (!customer.ok) {
    console.error("[order-emails] customer receipt not sent", {
      orderNumber: order.orderNumber,
      ...customer,
    });
  }
  if (!admin.ok) {
    console.error("[order-emails] admin alert not sent", {
      orderNumber: order.orderNumber,
      ...admin,
    });
  }
  if (!admin.ok && admin.reason === "no-recipient") {
    console.warn(
      "[order-emails] ADMIN_ORDER_EMAIL is not set — nobody was told about " +
        `order ${order.orderNumber}.`,
    );
  }

  return { customer, admin };
}

/**
 * Everyone who needs to see an order that is waiting for payment.
 *
 * `ADMIN_ORDER_EMAIL` is the configured list, but this email is the *only* thing
 * standing between a placed order and a sale while PayFast is unapproved. If that
 * variable is unset, or points somewhere that isn't watched, the order is simply
 * lost. So the shop's own published address is always in the list — deduped
 * case-insensitively, since a duplicate recipient means Resend sends twice.
 */
function requestRecipients() {
  const seen = new Set<string>();

  return [...getAdminOrderRecipients(), SITE.email].filter((address) => {
    const key = address.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Send the awaiting-payment pair. Resolves rather than rejects, always.
 *
 * Called from `/api/checkout` after the order is committed. By that point the
 * order exists and stock has been taken, so a mail failure must not turn into a
 * 500 — the customer would see an error for an order that was placed, and would
 * quite reasonably place it again. Failures are logged and returned as values,
 * and the success page tells the customer what to expect either way.
 */
export async function sendOrderRequestEmails(
  orderId: string,
): Promise<OrderEmailOutcome> {
  const failed = (detail: string): SendEmailResult => ({
    ok: false,
    reason: "failed",
    detail,
  });

  let order: OrderForEmail | null = null;

  try {
    order = await loadOrderForEmail(orderId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[order-request-emails] could not load order", {
      orderId,
      detail,
    });
    return { customer: failed(detail), admin: failed(detail) };
  }

  if (!order) {
    console.error("[order-request-emails] order not found", { orderId });
    return {
      customer: failed("order not found"),
      admin: failed("order not found"),
    };
  }

  const customerEmail = buildCustomerRequestEmail(order);
  const adminEmail = buildAdminRequestEmail(order);

  const [customer, admin] = await Promise.all([
    sendEmail({
      to: order.email,
      subject: customerEmail.subject,
      html: customerEmail.html,
      text: customerEmail.text,
    }),
    sendEmail({
      to: requestRecipients(),
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
      // The whole point of this email is to start a conversation about payment.
      // Hitting reply should open one with the customer.
      replyTo: order.email,
    }),
  ]);

  if (!customer.ok) {
    console.error("[order-request-emails] customer acknowledgement not sent", {
      orderNumber: order.orderNumber,
      ...customer,
    });
  }
  if (!admin.ok) {
    // Louder than its paid counterpart on purpose: an unsent alert here is an
    // order nobody will ever ask to be paid for.
    console.error("[order-request-emails] PAYMENT REQUEST NOT SENT — order " +
      `${order.orderNumber} is waiting and nobody has been told`, admin);
  }

  return { customer, admin };
}
