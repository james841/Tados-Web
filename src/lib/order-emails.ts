import { SITE } from "@/lib/constants";
import { getAdminOrderRecipients, sendEmail, type SendEmailResult } from "@/lib/email";
import {
  buildAdminEmail,
  buildCustomerEmail,
  type OrderForEmail,
} from "@/lib/order-email-templates";
import { prisma } from "@/lib/prisma";

/**
 * The two emails a paid order produces: a receipt for the customer and an alert
 * for whoever has to pack it.
 *
 * Both are built from one database read and sent from one place, because the
 * failure mode that matters is asymmetric — a customer receipt that sends while
 * the admin alert silently doesn't means a paid order nobody knows about.
 *
 * Sent from the Payfast ITN handler, which is the only thing that marks an
 * order paid. Nothing on the browser's return path sends these, so a receipt
 * can never go out for money that hasn't arrived.
 *
 * The templates themselves live in `order-email-templates.ts` so they can be
 * rendered without a database connection — see `npm run email:preview`.
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
 * Everyone who has to see a new order.
 *
 * `ADMIN_ORDER_EMAIL` is the configured list, and it is the right place to add
 * a packer or a second inbox. But it is an environment variable, which means it
 * can be unset in a new deployment, typo'd, or point at a mailbox nobody opens —
 * and the failure is silent, because a paid order still looks fine from the
 * shop front while nobody is packing it.
 *
 * So the shop's own published address is always in the list. Deduped
 * case-insensitively, because a duplicate recipient means the provider sends
 * the same alert twice.
 */
function adminRecipients() {
  const seen = new Set<string>();

  return [...getAdminOrderRecipients(), SITE.email].filter((address) => {
    const key = address.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
      to: adminRecipients(),
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
    // Louder than the customer's receipt: a missed receipt is an annoyed
    // customer who can still be emailed, while a missed alert is a paid order
    // that nobody is packing.
    console.error(
      `[order-emails] ORDER ALERT NOT SENT — ${order.orderNumber} is paid and nobody has been told`,
      admin,
    );
  }

  return { customer, admin };
}

