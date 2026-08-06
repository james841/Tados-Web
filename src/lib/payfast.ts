import crypto from "crypto";

/**
 * PayFast integration (South Africa).
 *
 * Flow:
 *  1. `buildPaymentData()`   -> field set for the redirect form
 *  2. `generateSignature()`  -> MD5 of the urlencoded param string (+passphrase)
 *  3. Buyer posts the form to PayFast and pays
 *  4. PayFast POSTs an ITN to /api/payfast/notify (server-to-server)
 *  5. We verify signature -> validate host -> confirm amount -> mark order paid
 *
 * Sandbox first: set PAYFAST_MODE="sandbox". Switching to live only requires
 * changing PAYFAST_MODE + the merchant credentials in .env.
 *
 * Signature rules that trip people up, all handled below:
 *  - Fields must be in the order PayFast documents, NOT alphabetical.
 *  - Empty fields are excluded entirely.
 *  - Spaces encode as "+", and the encoding must be UPPERCASE hex (%2C not %2c).
 *  - The passphrase is appended last, and only when one is configured.
 */

export const PAYFAST_MODE = (process.env.PAYFAST_MODE ?? "sandbox") as
  | "sandbox"
  | "live";

export const IS_SANDBOX = PAYFAST_MODE !== "live";

export const PAYFAST_PROCESS_URL = IS_SANDBOX
  ? "https://sandbox.payfast.co.za/eng/process"
  : "https://www.payfast.co.za/eng/process";

const PAYFAST_VALIDATE_URL = IS_SANDBOX
  ? "https://sandbox.payfast.co.za/eng/query/validate"
  : "https://www.payfast.co.za/eng/query/validate";

/** Only these hosts may deliver an ITN. */
const VALID_ITN_HOSTS = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
];

export function getPayFastConfig() {
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID ?? "10000100",
    merchantKey: process.env.PAYFAST_MERCHANT_KEY ?? "46f0cd694581a",
    passphrase: process.env.PAYFAST_PASSPHRASE ?? "",
    mode: PAYFAST_MODE,
    processUrl: PAYFAST_PROCESS_URL,
  };
}

/**
 * PayFast expects PHP's urlencode(): spaces as "+", uppercase hex escapes.
 * encodeURIComponent leaves !'()* alone and lowercases nothing, so we patch it.
 */
function payfastEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
}

/**
 * Build the MD5 signature.
 *
 * `data` must already be in PayFast's documented field order — JS objects
 * preserve string-key insertion order, which is what we rely on here.
 */
export function generateSignature(
  data: Record<string, string>,
  passphrase = "",
): string {
  const paramString = Object.entries(data)
    .filter(([key, value]) => key !== "signature" && value !== "" && value != null)
    .map(([key, value]) => `${key}=${payfastEncode(String(value))}`)
    .join("&");

  const withPassphrase = passphrase
    ? `${paramString}&passphrase=${payfastEncode(passphrase)}`
    : paramString;

  return crypto.createHash("md5").update(withPassphrase).digest("hex");
}

export interface PayFastPaymentInput {
  orderNumber: string;
  amount: number;
  itemName: string;
  itemDescription?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  siteUrl: string;
}

/**
 * Returns the exact field set to POST to PayFast, signature included.
 * Field order below is PayFast's required signature order — do not sort it.
 */
export function buildPaymentData(input: PayFastPaymentInput) {
  const config = getPayFastConfig();

  const data: Record<string, string> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${input.siteUrl}/checkout/success?order=${input.orderNumber}`,
    cancel_url: `${input.siteUrl}/checkout/cancelled?order=${input.orderNumber}`,
    notify_url: `${input.siteUrl}/api/payfast/notify`,

    name_first: input.firstName,
    name_last: input.lastName,
    email_address: input.email,
  };

  if (input.phone) {
    // PayFast wants digits only, max 10 (local SA format).
    const digits = input.phone.replace(/\D/g, "").slice(-10);
    if (digits.length === 10) data.cell_number = digits;
  }

  data.m_payment_id = input.orderNumber;
  // Must be a plain decimal string with 2 places, no thousands separator.
  data.amount = input.amount.toFixed(2);
  data.item_name = input.itemName.slice(0, 100);

  if (input.itemDescription) {
    data.item_description = input.itemDescription.slice(0, 255);
  }

  data.signature = generateSignature(data, config.passphrase);

  return data;
}

/** Re-compute the signature over an ITN payload and compare. */
export function verifyItnSignature(payload: Record<string, string>): boolean {
  const config = getPayFastConfig();
  const received = payload.signature;
  if (!received) return false;

  // ITN signature covers every field except `signature` itself, in the order
  // PayFast sent them.
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "signature") data[key] = value;
  }

  const expected = generateSignature(data, config.passphrase);
  return timingSafeEqual(expected, received);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Guard against spoofed ITN calls from arbitrary IPs. */
export async function isValidItnHost(remoteHost: string | null): Promise<boolean> {
  if (!remoteHost) return false;
  return VALID_ITN_HOSTS.some((host) => remoteHost.includes(host));
}

/**
 * Post the payload back to PayFast; they reply "VALID" or "INVALID".
 * This is the authoritative check — never mark an order paid without it.
 */
export async function validateItnWithPayFast(
  payload: Record<string, string>,
): Promise<boolean> {
  try {
    const body = new URLSearchParams(payload).toString();

    const response = await fetch(PAYFAST_VALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    const text = (await response.text()).trim();
    return text === "VALID";
  } catch (error) {
    console.error("[payfast] validation request failed", error);
    return false;
  }
}

/** Amounts must match to the cent, allowing for float representation. */
export function amountsMatch(expected: number, received: number): boolean {
  return Math.abs(expected - received) < 0.01;
}
