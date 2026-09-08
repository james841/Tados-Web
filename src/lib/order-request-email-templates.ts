import { DELIVERY_WINDOW, SITE, whatsappLink } from "@/lib/constants";
import {
  EMAIL_COLORS,
  EMAIL_FONT,
  escapeHtml,
  getPublicBaseUrl,
  renderEmailShell,
} from "@/lib/email";
import {
  customerName,
  firstName,
  LABEL,
  renderAddressBlock,
  renderButton,
  renderItemRows,
  renderOrderHeadline,
  renderTotalsRows,
  textAddressLines,
  textItemLines,
  type OrderForEmail,
  type RenderedEmail,
} from "@/lib/order-email-templates";
import { formatDateTime, formatPrice, toNumber } from "@/lib/utils";

/**
 * The two emails an order sends while PayFast is still waiting on approval —
 * see `lib/checkout-mode.ts`.
 *
 * Deliberately a separate pair rather than a `variant` flag on the paid
 * templates. The difference between them is not decoration: one says money has
 * arrived and the other says it hasn't, and every sentence around that changes.
 * Threading a boolean through the paid receipt would put the wrong claim one
 * typo away, on the email that matters most. The layout primitives are shared,
 * so the four emails still look like one shop.
 *
 * What the copy is not allowed to do:
 *
 *  - claim payment has been received, or that the order is confirmed
 *  - invent a bank account, a reference format or a settlement deadline
 *
 * Both emails carry the fastest available route to a human — WhatsApp for the
 * customer, WhatsApp plus a reply-to for the shop — because an order that needs
 * payment arranged is worth exactly as much as the speed of that first reply.
 */

const {
  ink950,
  ink900,
  ink700,
  ink600,
  ink500,
  ink200,
  ink100,
  brand600,
  accent500,
  accent50,
} = EMAIL_COLORS;

/** The one figure both emails hang on: owed, not paid. */
const TOTAL_DUE = "Total due";

/**
 * Subtotal, delivery, discount and total, for the plain-text part.
 *
 * The discount line is conditional for the same reason it is in the HTML: an
 * order with money knocked off it has to add up, and one that silently doesn't is
 * read as a mistake in the shop's favour.
 */
function textTotalLines(order: OrderForEmail) {
  const shipping = toNumber(order.shipping);
  const discount = toNumber(order.discount);

  return [
    `  Subtotal   ${formatPrice(toNumber(order.subtotal))}`,
    `  Delivery   ${shipping === 0 ? "Free" : formatPrice(shipping)}`,
    discount > 0 ? `  Discount   −${formatPrice(discount)}` : null,
    `  Total due  ${formatPrice(toNumber(order.total))}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * A phone number as wa.me wants it: digits only, country code included.
 *
 * South African numbers arrive from the checkout form in whatever shape the
 * customer types — `082 123 4567`, `+27 82 123 4567`, `0027821234567`. wa.me
 * accepts none of those, and a link that opens an empty chat is worse than no
 * link, so anything that doesn't normalise cleanly returns null and the button
 * is left out.
 */
export function whatsAppNumber(raw: string | null | undefined) {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Local trunk prefix: 082… is +27 82…
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  // Nine digits with no trunk prefix and no country code is still an SA mobile.
  if (digits.length === 9) digits = `27${digits}`;

  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

// ---------------------------------------------------------------
// CUSTOMER — order received, payment being arranged
// ---------------------------------------------------------------

export function buildCustomerRequestEmail(order: OrderForEmail): RenderedEmail {
  // Only a signed-in customer has an order page to return to. Sending a guest a
  // link that bounces them to /login is worse than sending no link.
  const orderUrl = order.userId
    ? `${getPublicBaseUrl()}/account/orders/${order.id}`
    : null;

  const total = formatPrice(toNumber(order.total));

  const whatsapp = whatsappLink(
    `Hi ${SITE.shortName}, I've placed order ${order.orderNumber} (${total}) and would like to arrange payment.`,
  );

  const step = (n: string, copy: string, last = false) => `<tr>
        <td width="26" valign="top" style="font-family:${EMAIL_FONT};font-size:13px;font-weight:700;color:${accent500};padding:0 0 ${last ? "0" : "10px"};">${n}</td>
        <td valign="top" style="font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:${ink600};padding:0 0 ${last ? "0" : "10px"};">${copy}</td>
      </tr>`;

  const body = `
  <tr><td style="padding:34px 32px 0;font-family:${EMAIL_FONT};">
    <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:${ink900};">
      Thanks, ${escapeHtml(firstName(order))} — we've got your order.
    </h1>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.65;color:${ink600};">
      Your items are set aside. We'll reply to this email with payment options and
      confirm everything — usually within a couple of hours during
      ${escapeHtml(SITE.operatingHours)}. Nothing has been charged yet.
    </p>
  </td></tr>

  <tr><td style="padding:26px 32px 0;">
    ${renderOrderHeadline(order, accent500)}
  </td></tr>

  <tr><td style="padding:24px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:${accent50};border-radius:10px;padding:18px 20px;">
        <p style="${LABEL}margin:0 0 8px;">Want it sooner?</p>
        <p style="margin:0 0 14px;font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:${ink700};">
          Message us and we'll sort the payment out with you there and then. Your
          order number is all we need.
        </p>
        ${renderButton(whatsapp, "Chat to us on WhatsApp", accent500)}
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:30px 32px 0;">
    <p style="${LABEL}margin:0 0 6px;">What you ordered</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${renderItemRows(order)}
    </table>
  </td></tr>

  <tr><td style="padding:18px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td></td><td width="250">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${renderTotalsRows(order, { totalLabel: TOTAL_DUE, accent: accent500 })}
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:30px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:${ink100};border-radius:10px;padding:18px 20px;">
        <p style="${LABEL}margin:0 0 8px;">Delivering to</p>
        ${renderAddressBlock(order)}
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:28px 32px 0;">
    <p style="${LABEL}margin:0 0 10px;">What happens next</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${step("1", "We check your order and send you payment options.")}
      ${step("2", "You settle it whichever way suits you best.")}
      ${step("3", `We pack and dispatch — ${escapeHtml(DELIVERY_WINDOW)} nationwide, and installation support is on WhatsApp once it lands.`, true)}
    </table>
  </td></tr>

  ${
    orderUrl
      ? `<tr><td style="padding:26px 32px 0;">
    ${renderButton(orderUrl, "View your order", ink950)}
  </td></tr>`
      : ""
  }

  <tr><td style="padding:32px 32px 0;"></td></tr>`;

  const html = renderEmailShell({
    title: "Order received",
    preheader: `We've got order ${order.orderNumber} — ${total}. Payment options are on the way.`,
    accent: accent500,
    body,
    footerNote:
      "Changed your mind? Reply to this email and we'll cancel it — nothing has been charged.",
  });

  const text = `Thanks, ${firstName(order)} — we've got your order.

Your items are set aside. We'll reply to this email with payment options and
confirm everything — usually within a couple of hours during ${SITE.operatingHours}.
Nothing has been charged yet.

ORDER NUMBER  ${order.orderNumber}
PLACED        ${formatDateTime(order.createdAt)}
TOTAL DUE     ${total}

WANT IT SOONER?
  Message us and we'll sort the payment out with you there and then:
  ${whatsapp}

WHAT YOU ORDERED
${textItemLines(order)}

${textTotalLines(order)}

DELIVERING TO
${textAddressLines(order)}

WHAT HAPPENS NEXT
  1. We check your order and send you payment options.
  2. You settle it whichever way suits you best.
  3. We pack and dispatch — ${DELIVERY_WINDOW} nationwide.
${orderUrl ? `\nView your order: ${orderUrl}\n` : ""}
Changed your mind? Reply to this email and we'll cancel it — nothing has been charged.

${SITE.name} · ${SITE.email} · ${SITE.phone}`;

  return {
    subject: `We've got order ${order.orderNumber} — payment options on the way`,
    html,
    text,
  };
}

// ---------------------------------------------------------------
// SHOP — payment needs arranging
// ---------------------------------------------------------------

export function buildAdminRequestEmail(order: OrderForEmail): RenderedEmail {
  const adminUrl = `${getPublicBaseUrl()}/admin/orders/${order.id}`;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const phone = order.address?.phone ?? order.phone;
  const wa = whatsAppNumber(phone);
  const total = formatPrice(toNumber(order.total));

  const customerWhatsapp = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(
        `Hi ${firstName(order)}, thanks for order ${order.orderNumber} with ${SITE.name} (${total}). Here's how to pay:`,
      )}`
    : null;

  const fact = (label: string, value: string, href?: string) => `
      <tr>
        <td width="104" valign="top" style="padding:7px 12px 7px 0;${LABEL}">${label}</td>
        <td valign="top" style="padding:7px 0;font-family:${EMAIL_FONT};font-size:13px;color:${ink900};word-break:break-word;">
          ${href ? `<a href="${href}" style="color:${ink900};text-decoration:underline;">${value}</a>` : value}
        </td>
      </tr>`;

  const body = `
  <tr><td style="padding:34px 32px 0;font-family:${EMAIL_FONT};">
    <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:${ink900};">
      Arrange payment — ${total}
    </h1>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.65;color:${ink600};">
      ${escapeHtml(customerName(order))} ordered ${itemCount} item${itemCount === 1 ? "" : "s"}
      and is waiting to hear how to pay. Nothing has been charged, and the stock
      is already held against this order.
    </p>
    <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:${ink500};">
      Reply to this email and it goes straight to them.
    </p>
  </td></tr>

  <tr><td style="padding:26px 32px 0;">
    ${renderOrderHeadline(order, accent500)}
  </td></tr>

  <tr><td style="padding:24px 32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td>${renderButton(adminUrl, "Open in admin", accent500)}</td>
      ${
        customerWhatsapp
          ? `<td width="10"></td><td>${renderButton(customerWhatsapp, "WhatsApp the customer", brand600)}</td>`
          : ""
      }
    </tr></table>
  </td></tr>

  <tr><td style="padding:30px 32px 0;">
    <p style="${LABEL}margin:0 0 6px;">Customer</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${fact("Name", escapeHtml(customerName(order)))}
      ${fact("Email", escapeHtml(order.email), `mailto:${encodeURIComponent(order.email)}`)}
      ${phone ? fact("Phone", escapeHtml(phone), `tel:${encodeURIComponent(phone)}`) : ""}
      ${fact("Account", order.userId ? "Registered customer" : "Guest checkout")}
      ${fact("Payment", "Not received — being arranged by email")}
    </table>
  </td></tr>

  <tr><td style="padding:26px 32px 0;">
    <p style="${LABEL}margin:0 0 6px;">To pack once paid</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${renderItemRows(order)}
    </table>
  </td></tr>

  <tr><td style="padding:18px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td></td><td width="250">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${renderTotalsRows(order, { totalLabel: TOTAL_DUE, accent: accent500 })}
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:30px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:${accent50};border-radius:10px;padding:18px 20px;">
        <p style="${LABEL}margin:0 0 8px;">Ship to</p>
        ${renderAddressBlock(order)}
      </td></tr>
    </table>
  </td></tr>

  ${
    order.notes
      ? `<tr><td style="padding:20px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="border:1px solid ${ink200};border-radius:10px;padding:18px 20px;">
        <p style="${LABEL}margin:0 0 8px;">Customer notes</p>
        <p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.65;color:${ink700};white-space:pre-wrap;">${escapeHtml(order.notes)}</p>
      </td></tr>
    </table>
  </td></tr>`
      : ""
  }

  <tr><td style="padding:32px 32px 0;"></td></tr>`;

  const html = renderEmailShell({
    title: "Payment needed",
    preheader: `${order.orderNumber} · ${total} · ${customerName(order)} is waiting for payment details`,
    accent: accent500,
    body,
    footerNote:
      "Card payments switch back on by themselves once PayFast is approved — set NEXT_PUBLIC_CHECKOUT_MODE=payfast and this email stops.",
  });

  const text = `ARRANGE PAYMENT — ${total}

${customerName(order)} ordered ${itemCount} item${itemCount === 1 ? "" : "s"} and is waiting to hear
how to pay. Nothing has been charged, and the stock is already held against
this order. Reply to this email and it goes straight to them.

ORDER NUMBER  ${order.orderNumber}
PLACED        ${formatDateTime(order.createdAt)}
TOTAL DUE     ${total}

Open in admin: ${adminUrl}
${customerWhatsapp ? `WhatsApp the customer: ${customerWhatsapp}\n` : ""}
CUSTOMER
  Name     ${customerName(order)}
  Email    ${order.email}
${phone ? `  Phone    ${phone}\n` : ""}  Account  ${order.userId ? "Registered customer" : "Guest checkout"}
  Payment  Not received — being arranged by email

TO PACK ONCE PAID
${textItemLines(order)}

${textTotalLines(order)}

SHIP TO
${textAddressLines(order)}
${order.notes ? `\nCUSTOMER NOTES\n  ${order.notes}\n` : ""}`;

  return {
    subject: `Payment needed — ${order.orderNumber} · ${total}`,
    html,
    text,
  };
}
