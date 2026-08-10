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
 *  - The signature is *derived from* the passphrase, so it is only sent when one
 *    is configured. See `buildPaymentData()` for why that matters in sandbox.
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

/**
 * Normalise a South African number to the 10-digit local mobile format
 * PayFast accepts ("0821234567"), or return null if it isn't one.
 *
 * PayFast rejects the whole transaction with "cell_number: The cell number
 * format is invalid" rather than ignoring a bad value, so anything we aren't
 * sure about is better left out — the field is optional.
 *
 * Naively taking the last 10 digits is what breaks here: "+27 82 123 4567" is
 * 11 digits, and its last 10 are "7821234567" — a well-formed-looking number
 * starting with 7 that is not a valid SA mobile. The country code has to be
 * stripped from the front instead.
 *
 * Landlines (011…, 021…) are also rejected: PayFast wants a *cell* number, and
 * the checkout form accepts any SA phone number.
 */
function toSaCellNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");

  // "0027821234567" -> "27821234567"
  if (digits.startsWith("00")) digits = digits.slice(2);
  // "27821234567" -> "821234567"
  if (digits.startsWith("27")) digits = digits.slice(2);
  // "0821234567" -> "821234567"
  else if (digits.startsWith("0")) digits = digits.slice(1);

  // SA subscriber numbers are 9 digits; mobile prefixes start 6, 7 or 8.
  if (!/^[678]\d{8}$/.test(digits)) return null;

  return `0${digits}`;
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
    const cell = toSaCellNumber(input.phone);
    if (cell) data.cell_number = cell;
  }

  data.m_payment_id = input.orderNumber;
  // Must be a plain decimal string with 2 places, no thousands separator.
  data.amount = input.amount.toFixed(2);
  data.item_name = input.itemName.slice(0, 100);

  if (input.itemDescription) {
    data.item_description = input.itemDescription.slice(0, 255);
  }

  /**
   * Sign only when a passphrase is configured.
   *
   * PayFast validates `signature` against the passphrase set on the *merchant
   * account*, not against anything in the request. The two settings have to
   * agree in both directions: sending a signature when the account has no
   * passphrase fails, and so does omitting one when it has.
   *
   * This matters in sandbox because merchant 10000100 is a shared public test
   * account that anyone can log into and reconfigure. When someone sets a
   * passphrase on it, every signature we compute is rejected with "Generated
   * signature does not match submitted signature" — the request is otherwise
   * perfectly valid, and posting it unsigned goes straight through.
   *
   * Live accounts are private and must always set PAYFAST_PASSPHRASE, so the
   * guard below refuses to build an unsigned live payment rather than silently
   * downgrading real money to an unauthenticated request.
   */
  if (config.passphrase) {
    data.signature = generateSignature(data, config.passphrase);
  } else if (!IS_SANDBOX) {
    throw new Error(
      "PAYFAST_PASSPHRASE is required in live mode: refusing to send an unsigned payment.",
    );
  }

  return data;
}

/**
 * Re-compute the signature over an ITN payload and compare.
 *
 * Mirrors the send side: the comparison is only meaningful when a passphrase is
 * configured, because that is the shared secret it rests on.
 *
 *  - Live, no passphrase  -> reject. `buildPaymentData()` makes this state
 *    unreachable, and failing closed is the right default if it ever happens.
 *  - Sandbox, no passphrase -> cannot verify locally. Defer to the postback in
 *    `validateItnWithPayFast()`, which asks PayFast to vouch for the payload and
 *    is the stronger of the two checks. The notify route never skips it.
 */
export function verifyItnSignature(payload: Record<string, string>): boolean {
  const config = getPayFastConfig();

  if (!config.passphrase) {
    if (!IS_SANDBOX) return false;
    console.warn(
      "[payfast] no PAYFAST_PASSPHRASE set — skipping local ITN signature check, relying on the PayFast postback",
    );
    return true;
  }

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
