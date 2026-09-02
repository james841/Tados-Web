import { Resend } from "resend";

import { SITE } from "@/lib/constants";

/**
 * Transactional email transport, on Resend.
 *
 * Two rules shape everything here:
 *
 * 1. **Sending never throws.** Every caller is a payment or order path, and an
 *    email provider having a bad afternoon must not roll back a paid order or
 *    make the PayFast ITN handler return a non-2xx. Failures are logged and
 *    returned as a value; the caller decides whether it cares (it doesn't).
 * 2. **Missing configuration is a skip, not a crash.** A fresh clone with no
 *    `RESEND_API_KEY` should still be able to place a test order. The absence is
 *    logged loudly enough to notice, once, rather than on every send.
 */

/** Where the branded colours come from — the OKLCH theme tokens, resolved to
 * hex because no email client supports `oklch()`. Kept beside the templates so
 * a palette change is one edit, not a hunt through inline styles. */
export const EMAIL_COLORS = {
  ink950: "#020202",
  ink900: "#0d0d0d",
  ink700: "#353535",
  ink600: "#4d4d4d",
  ink500: "#6c6c6c",
  ink400: "#929292",
  ink200: "#e4e4e4",
  ink100: "#f5f5f5",
  white: "#ffffff",
  brand600: "#007a32",
  brand50: "#ebf9f0",
  accent500: "#d66b00",
  accent50: "#fff3e8",
} as const;

/**
 * The font stack for every template.
 *
 * Web fonts are unreliable in email — Outlook ignores them outright — so the
 * personality has to come from weight, letterspacing and the number column
 * rather than from a typeface. This is the same reasoning the admin panel uses
 * for its uppercase micro-labels.
 */
export const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "not-configured" | "no-recipient" | "failed"; detail?: string };

let cachedClient: Resend | null = null;
let warnedMissingKey = false;
let warnedDefaultFrom = false;

function getClient() {
  const key = process.env.RESEND_API_KEY?.trim();

  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[email] RESEND_API_KEY is not set — transactional email is disabled. " +
          "Orders will still be recorded; no mail will be sent.",
      );
    }
    return null;
  }

  cachedClient ??= new Resend(key);
  return cachedClient;
}

/**
 * The From address.
 *
 * Resend will only accept a domain you have verified, with one exception:
 * `onboarding@resend.dev`, which works immediately but can only deliver to the
 * address that owns the Resend account. That makes it exactly right for local
 * testing and exactly wrong for production, so falling back to it warns.
 */
function getFrom() {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;

  if (!warnedDefaultFrom) {
    warnedDefaultFrom = true;
    console.warn(
      "[email] EMAIL_FROM is not set — falling back to onboarding@resend.dev, " +
        "which can only deliver to the Resend account owner. Set EMAIL_FROM to " +
        "an address on a verified domain before going live.",
    );
  }

  return `${SITE.name} <onboarding@resend.dev>`;
}

/**
 * Admin recipients for order alerts.
 *
 * A list rather than a single address, because "the client's Gmail" tends to
 * become "the client's Gmail and the warehouse" within a month. Comma or
 * semicolon separated so either habit works.
 */
export function getAdminOrderRecipients() {
  const raw = process.env.ADMIN_ORDER_EMAIL?.trim();
  if (!raw) return [];

  return raw
    .split(/[,;]/)
    .map((address) => address.trim())
    .filter(Boolean);
}

/**
 * Absolute origin for links inside emails.
 *
 * An email has no "current page" to resolve a relative href against, so every
 * link has to be absolute — and getting it wrong is silent: the mail sends, and
 * the customer clicks through to `http://localhost:3000`.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when it points somewhere real. The Vercel-provided
 * hosts are the fallback, in the order that matters: the stable production
 * domain first, then the per-deployment URL, so a preview build links to itself
 * rather than to production.
 */
export function getPublicBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  // A localhost value in a deployed environment is configuration drift, not an
  // intention — ignoring it beats emailing customers a dead link.
  const isUsableConfigured =
    configured &&
    !(process.env.VERCEL && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(configured));

  if (isUsableConfigured) return configured;

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return `https://${productionHost.replace(/\/+$/, "")}`;

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) return `https://${deploymentHost.replace(/\/+$/, "")}`;

  return configured || "http://localhost:3000";
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((address) => address.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { ok: false, reason: "no-recipient" };
  }

  const client = getClient();
  if (!client) return { ok: false, reason: "not-configured" };

  try {
    const { data, error } = await client.emails.send({
      from: getFrom(),
      to: recipients,
      subject,
      html,
      // A text part is not decoration: its absence is one of the strongest spam
      // signals a transactional email can carry.
      text,
      replyTo: replyTo ?? SITE.email,
    });

    if (error) {
      console.error("[email] send rejected", { subject, error });
      return { ok: false, reason: "failed", detail: error.message };
    }

    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    // Network fault, DNS, timeout — anything the SDK didn't turn into `error`.
    console.error("[email] send threw", { subject, error });
    return {
      ok: false,
      reason: "failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Escape a value for interpolation into email HTML.
 *
 * Product names, customer names, delivery addresses and order notes are all
 * attacker-influenced text arriving from a checkout form. Unescaped, a note
 * containing markup would rewrite the layout of the admin's own alert email.
 */
export function escapeHtml(value: string | null | undefined) {
  if (!value) return "";

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The shared shell: preheader, centred card, wordmark, footer.
 *
 * `accent` is the one colour that changes between the customer receipt (brand
 * green — settled, reassuring) and the admin alert (orange — needs attention).
 * Everything else is identical, so the two never drift apart.
 */
export function renderEmailShell({
  title,
  preheader,
  accent,
  body,
  footerNote,
}: {
  title: string;
  preheader: string;
  accent: string;
  body: string;
  footerNote?: string;
}) {
  const { ink950, ink500, ink400, ink200, ink100, white } = EMAIL_COLORS;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${ink100};font-family:${EMAIL_FONT};-webkit-font-smoothing:antialiased;">

<!-- Preheader: the grey line the inbox shows after the subject. Left empty it
     fills itself with whatever text comes first, which is usually the wordmark. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${ink100};">
<tr><td align="center" style="padding:32px 12px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:${white};border-radius:12px;overflow:hidden;">

  <!-- Wordmark band. Typographic rather than an <img>: every client blocks
       remote images by default, and a blocked logo is a broken first
       impression. Letterspaced caps carry the brand instead. -->
  <tr><td style="background:${ink950};padding:22px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-family:${EMAIL_FONT};">
        <span style="display:block;color:${white};font-size:17px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">Tados</span>
        <span style="display:block;margin-top:3px;color:${ink400};font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">Smart Technology</span>
      </td>
      <td align="right" style="font-family:${EMAIL_FONT};color:${accent};font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
        ${escapeHtml(title)}
      </td>
    </tr></table>
  </td></tr>

  ${body}

  <tr><td style="border-top:1px solid ${ink200};padding:24px 32px 28px;font-family:${EMAIL_FONT};">
    ${
      footerNote
        ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:${ink500};">${footerNote}</p>`
        : ""
    }
    <p style="margin:0;font-size:12px;line-height:1.7;color:${ink500};">
      <a href="mailto:${SITE.email}" style="color:${ink500};text-decoration:underline;">${SITE.email}</a>
      &nbsp;·&nbsp; ${escapeHtml(SITE.phone)}
      &nbsp;·&nbsp; ${escapeHtml(SITE.operatingHours)}
    </p>
    <p style="margin:10px 0 0;font-size:11px;line-height:1.6;color:${ink400};">
      ${escapeHtml(SITE.name)} · ${escapeHtml(SITE.address.city)}, ${escapeHtml(SITE.address.province)}, South Africa
    </p>
  </td></tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}
