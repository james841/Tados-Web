import { SITE } from "@/lib/constants";
import {
  EMAIL_COLORS,
  EMAIL_FONT,
  escapeHtml,
  getPublicBaseUrl,
  renderEmailShell,
} from "@/lib/email";
import { formatDateTime, formatPrice, toNumber } from "@/lib/utils";

/**
 * The two order emails, as pure functions of an order.
 *
 * Separated from the sending code so they can be rendered without a database or
 * an API key — `npm run email:preview` writes both to disk. An email template
 * you can't look at before it goes out is one that breaks silently, and the only
 * person who finds out is the customer.
 */

/** Anything `toNumber` can read: a Prisma `Decimal`, a string, or a number. That
 * last one is what lets the preview script pass plain literals. */
type Money = number | string | { toString(): string };

/**
 * What the templates need in order to render.
 *
 * Declared here rather than inferred from the Prisma query, so the requirement
 * lives with the thing that has it — `order-emails.ts` assigns its query result
 * to this type, which means dropping a field from the `select` fails the build
 * instead of rendering a blank row in a customer's receipt.
 */
export type OrderForEmail = {
  id: string;
  orderNumber: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
  createdAt: Date | string;
  userId: string | null;
  user: { name: string | null; email: string } | null;
  address: {
    firstName: string;
    lastName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  } | null;
  items: {
    id: string;
    name: string;
    sku: string;
    price: Money;
    quantity: number;
  }[];
  payment: {
    provider: string;
    status: string;
    pfPaymentId: string | null;
    amount: Money;
  } | null;
};

export type RenderedEmail = { subject: string; html: string; text: string };

const {
  ink950,
  ink900,
  ink700,
  ink600,
  ink500,
  ink400,
  ink200,
  ink100,
  white,
  brand600,
  brand50,
  accent500,
  accent50,
} = EMAIL_COLORS;

/** The uppercase micro-label used for every section heading, matching the
 * admin panel's own card headers so the email reads as part of the product. */
const LABEL = `font-family:${EMAIL_FONT};font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${ink400};`;

/** Best available name for the person who ordered — the address is the most
 * reliable source, since guest checkout has no user record at all. */
export function customerName(order: OrderForEmail) {
  if (order.address) {
    return `${order.address.firstName} ${order.address.lastName}`.trim();
  }
  return order.user?.name?.trim() || order.email;
}

function firstName(order: OrderForEmail) {
  const full = customerName(order);
  // An email address standing in for a name should not be split on a space.
  if (full.includes("@")) return full;
  return full.split(/\s+/)[0] || full;
}

function renderItemRows(order: OrderForEmail) {
  return order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${ink200};font-family:${EMAIL_FONT};">
          <span style="display:block;font-size:14px;font-weight:600;color:${ink900};line-height:1.4;">${escapeHtml(item.name)}</span>
          <span style="display:block;margin-top:3px;font-size:11px;color:${ink400};">SKU ${escapeHtml(item.sku)}</span>
        </td>
        <td align="center" style="padding:12px 8px;border-bottom:1px solid ${ink200};font-family:${EMAIL_FONT};font-size:13px;color:${ink600};white-space:nowrap;">
          ×${item.quantity}
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${ink200};font-family:${EMAIL_FONT};font-size:14px;font-weight:600;color:${ink900};white-space:nowrap;">
          ${formatPrice(toNumber(item.price) * item.quantity)}
        </td>
      </tr>`,
    )
    .join("");
}

function renderTotalsRows(order: OrderForEmail) {
  const shipping = toNumber(order.shipping);
  const discount = toNumber(order.discount);
  const tax = toNumber(order.tax);

  const line = (label: string, value: string) => `
      <tr>
        <td style="padding:5px 0;font-family:${EMAIL_FONT};font-size:13px;color:${ink600};">${label}</td>
        <td align="right" style="padding:5px 0;font-family:${EMAIL_FONT};font-size:13px;color:${ink700};white-space:nowrap;">${value}</td>
      </tr>`;

  return `
      ${line("Subtotal", formatPrice(toNumber(order.subtotal)))}
      ${line("Delivery", shipping === 0 ? "Free" : formatPrice(shipping))}
      ${discount > 0 ? line("Discount", `−${formatPrice(discount)}`) : ""}
      ${tax > 0 ? line("VAT", formatPrice(tax)) : ""}
      <tr>
        <td style="padding:12px 0 0;border-top:2px solid ${brand600};font-family:${EMAIL_FONT};font-size:14px;font-weight:700;color:${ink900};">Total paid</td>
        <td align="right" style="padding:12px 0 0;border-top:2px solid ${brand600};font-family:${EMAIL_FONT};font-size:18px;font-weight:700;color:${ink900};white-space:nowrap;">${formatPrice(toNumber(order.total))}</td>
      </tr>`;
}

function renderAddressBlock(order: OrderForEmail) {
  if (!order.address) {
    return `<p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;color:${ink500};">No delivery address was captured with this order.</p>`;
  }

  const a = order.address;
  const lines = [
    `${a.firstName} ${a.lastName}`,
    a.line1,
    a.line2,
    `${a.city}, ${a.province}`,
    a.postalCode,
    a.country,
  ].filter(Boolean) as string[];

  return `<p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.7;color:${ink700};">
      ${lines.map((line) => escapeHtml(line)).join("<br>")}
      <br><span style="color:${ink500};">${escapeHtml(a.phone)}</span>
    </p>`;
}

function renderButton(href: string, label: string, background: string) {
  // A table-wrapped anchor rather than a styled <button>: Outlook renders padding
  // on an inline anchor inconsistently, and a bare link reads as an afterthought
  // next to the rest of the layout.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background:${background};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:13px 26px;font-family:${EMAIL_FONT};font-size:14px;font-weight:700;color:${white};text-decoration:none;letter-spacing:0.01em;">${escapeHtml(label)}</a>
      </td>
    </tr></table>`;
}

/** The order number and total, side by side against a coloured rule. This is the
 * block both emails get scanned for, so it carries the weight. */
function renderOrderHeadline(order: OrderForEmail, accent: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-left:3px solid ${accent};padding:2px 0 2px 14px;">
        <span style="${LABEL}display:block;">Order number</span>
        <span style="display:block;margin-top:5px;font-family:${EMAIL_FONT};font-size:20px;font-weight:700;letter-spacing:0.06em;color:${ink900};">${escapeHtml(order.orderNumber)}</span>
        <span style="display:block;margin-top:5px;font-family:${EMAIL_FONT};font-size:12px;color:${ink500};">${escapeHtml(formatDateTime(order.createdAt))}</span>
      </td>
      <td align="right" valign="top" style="padding:2px 0;">
        <span style="${LABEL}display:block;">Total</span>
        <span style="display:block;margin-top:5px;font-family:${EMAIL_FONT};font-size:20px;font-weight:700;color:${ink900};white-space:nowrap;">${formatPrice(toNumber(order.total))}</span>
      </td>
    </tr></table>`;
}

function textItemLines(order: OrderForEmail) {
  return order.items
    .map(
      (item) =>
        `  ${item.name} (${item.sku})  ×${item.quantity}  ${formatPrice(
          toNumber(item.price) * item.quantity,
        )}`,
    )
    .join("\n");
}

function textAddressLines(order: OrderForEmail) {
  if (!order.address) return "  No delivery address captured.";

  const a = order.address;
  return [
    `  ${a.firstName} ${a.lastName}`,
    `  ${a.line1}`,
    a.line2 ? `  ${a.line2}` : null,
    `  ${a.city}, ${a.province} ${a.postalCode}`,
    `  ${a.country}`,
    `  ${a.phone}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------
// CUSTOMER RECEIPT
// ---------------------------------------------------------------

export function buildCustomerEmail(order: OrderForEmail): RenderedEmail {
  // Only a signed-in customer has an order page to return to. Sending a guest a
  // link that bounces them to /login is worse than sending no link.
  const orderUrl = order.userId
    ? `${getPublicBaseUrl()}/account/orders/${order.id}`
    : null;

  const step = (
    n: string,
    copy: string,
    last = false,
  ) => `<tr>
        <td width="26" valign="top" style="font-family:${EMAIL_FONT};font-size:13px;font-weight:700;color:${brand600};padding:0 0 ${last ? "0" : "10px"};">${n}</td>
        <td valign="top" style="font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:${ink600};padding:0 0 ${last ? "0" : "10px"};">${copy}</td>
      </tr>`;

  const body = `
  <tr><td style="padding:34px 32px 0;font-family:${EMAIL_FONT};">
    <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:${ink900};">
      Thanks, ${escapeHtml(firstName(order))} — your order is confirmed.
    </h1>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.65;color:${ink600};">
      Your payment came through and we've started getting your order ready.
      Keep this email for your records.
    </p>
  </td></tr>

  <tr><td style="padding:26px 32px 0;">
    ${renderOrderHeadline(order, brand600)}
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
          ${renderTotalsRows(order)}
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
      ${step("1", "We check and pack your items.")}
      ${step("2", "We hand the parcel to the courier and let you know it's on its way.")}
      ${step("3", "It's delivered and signed for. Installation support is on WhatsApp if you need a hand setting it up.", true)}
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
    title: "Order confirmed",
    preheader: `Order ${order.orderNumber} is confirmed — ${formatPrice(
      toNumber(order.total),
    )}`,
    accent: brand600,
    body,
    footerNote:
      "Something not right with this order? Reply to this email and we'll sort it out.",
  });

  const text = `Thanks, ${firstName(order)} — your order is confirmed.

Your payment came through and we've started getting your order ready.

ORDER NUMBER  ${order.orderNumber}
PLACED        ${formatDateTime(order.createdAt)}
TOTAL PAID    ${formatPrice(toNumber(order.total))}

WHAT YOU ORDERED
${textItemLines(order)}

  Subtotal   ${formatPrice(toNumber(order.subtotal))}
  Delivery   ${
    toNumber(order.shipping) === 0
      ? "Free"
      : formatPrice(toNumber(order.shipping))
  }
  Total      ${formatPrice(toNumber(order.total))}

DELIVERING TO
${textAddressLines(order)}

WHAT HAPPENS NEXT
  1. We check and pack your items.
  2. We hand the parcel to the courier and let you know it's on its way.
  3. It's delivered and signed for.
${orderUrl ? `\nView your order: ${orderUrl}\n` : ""}
Something not right with this order? Reply to this email.

${SITE.name} · ${SITE.email} · ${SITE.phone}`;

  return {
    subject: `Order ${order.orderNumber} confirmed — ${SITE.shortName}`,
    html,
    text,
  };
}

// ---------------------------------------------------------------
// ADMIN ALERT
// ---------------------------------------------------------------

export function buildAdminEmail(order: OrderForEmail): RenderedEmail {
  const adminUrl = `${getPublicBaseUrl()}/admin/orders/${order.id}`;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const phone = order.address?.phone ?? order.phone;

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
      New order to fulfil — ${formatPrice(toNumber(order.total))}
    </h1>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.65;color:${ink600};">
      ${escapeHtml(customerName(order))} paid for ${itemCount} item${itemCount === 1 ? "" : "s"}.
      It stays marked unread in the admin panel until someone opens it.
    </p>
  </td></tr>

  <tr><td style="padding:26px 32px 0;">
    ${renderOrderHeadline(order, accent500)}
  </td></tr>

  <tr><td style="padding:24px 32px 0;">
    ${renderButton(adminUrl, "Open in admin", accent500)}
  </td></tr>

  <tr><td style="padding:30px 32px 0;">
    <p style="${LABEL}margin:0 0 6px;">Customer</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${fact("Name", escapeHtml(customerName(order)))}
      ${fact("Email", escapeHtml(order.email), `mailto:${encodeURIComponent(order.email)}`)}
      ${phone ? fact("Phone", escapeHtml(phone), `tel:${encodeURIComponent(phone)}`) : ""}
      ${fact("Account", order.userId ? "Registered customer" : "Guest checkout")}
      ${
        order.payment
          ? fact(
              "Payment",
              `${escapeHtml(order.payment.provider)} · ${escapeHtml(order.payment.status)}${
                order.payment.pfPaymentId
                  ? ` · ${escapeHtml(order.payment.pfPaymentId)}`
                  : ""
              }`,
            )
          : ""
      }
    </table>
  </td></tr>

  <tr><td style="padding:26px 32px 0;">
    <p style="${LABEL}margin:0 0 6px;">To pack</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${renderItemRows(order)}
    </table>
  </td></tr>

  <tr><td style="padding:18px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td></td><td width="250">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${renderTotalsRows(order)}
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
      <tr><td style="background:${brand50};border-radius:10px;padding:18px 20px;">
        <p style="${LABEL}margin:0 0 8px;">Customer notes</p>
        <p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.65;color:${ink700};white-space:pre-wrap;">${escapeHtml(order.notes)}</p>
      </td></tr>
    </table>
  </td></tr>`
      : ""
  }

  <tr><td style="padding:32px 32px 0;"></td></tr>`;

  const html = renderEmailShell({
    title: "New order",
    preheader: `${order.orderNumber} · ${formatPrice(
      toNumber(order.total),
    )} · ${customerName(order)}`,
    accent: accent500,
    body,
    footerNote: "This alert goes to every address listed in ADMIN_ORDER_EMAIL.",
  });

  const text = `NEW ORDER TO FULFIL — ${formatPrice(toNumber(order.total))}

${customerName(order)} paid for ${itemCount} item${itemCount === 1 ? "" : "s"}.

ORDER NUMBER  ${order.orderNumber}
PLACED        ${formatDateTime(order.createdAt)}
TOTAL         ${formatPrice(toNumber(order.total))}

Open in admin: ${adminUrl}

CUSTOMER
  Name     ${customerName(order)}
  Email    ${order.email}
${phone ? `  Phone    ${phone}\n` : ""}  Account  ${order.userId ? "Registered customer" : "Guest checkout"}
${
  order.payment
    ? `  Payment  ${order.payment.provider} · ${order.payment.status}${
        order.payment.pfPaymentId ? ` · ${order.payment.pfPaymentId}` : ""
      }`
    : ""
}

TO PACK
${textItemLines(order)}

SHIP TO
${textAddressLines(order)}
${order.notes ? `\nCUSTOMER NOTES\n  ${order.notes}\n` : ""}`;

  return {
    subject: `New order ${order.orderNumber} — ${formatPrice(
      toNumber(order.total),
    )}`,
    html,
    text,
  };
}
