/**
 * How a checkout finishes.
 *
 * PayFast is the permanent payment path, and nothing about it changes here.
 * `lib/payfast.ts`, `/api/payfast/notify` and the signed form handoff are
 * reached exactly as they always were whenever the mode is `payfast`.
 *
 * Until the merchant account is approved PayFast cannot receive money, so the
 * default is `email`. The server still does all of the work that makes an order
 * correct — prices and stock come from the database, the order and its stock
 * decrement are one transaction — and only the final step changes: instead of
 * handing the customer to PayFast, it emails the shop to arrange payment and
 * emails the customer to say so. The customer never leaves the site.
 *
 * To put PayFast back, set one environment variable and redeploy:
 *
 *     NEXT_PUBLIC_CHECKOUT_MODE=payfast
 *
 * `NEXT_PUBLIC_` because the checkout form has to label its own button before
 * it has spoken to the server. The value is not a secret — it names which of
 * two public flows the storefront is running, which is visible either way from
 * the first click.
 */

export type CheckoutMode = "payfast" | "email";

export const CHECKOUT_MODE: CheckoutMode =
  process.env.NEXT_PUBLIC_CHECKOUT_MODE?.trim().toLowerCase() === "payfast"
    ? "payfast"
    : "email";

export const IS_EMAIL_CHECKOUT = CHECKOUT_MODE === "email";

/**
 * `Payment.provider` for an order completed over email.
 *
 * A payment row is still written, because the amount owed is a fact worth
 * recording and the admin panel reads it. Marking it `manual` rather than
 * `payfast` keeps three things honest: the admin sees at a glance that PayFast
 * never saw this order, the dev-only settlement helper knows to leave it alone,
 * and a future reconciliation can tell the two kinds of PENDING apart.
 */
export const MANUAL_PAYMENT_PROVIDER = "manual";
