import "server-only";

import {
  DELIVERY_WINDOW,
  FREE_SHIPPING_THRESHOLD,
  SITE,
  STANDARD_SHIPPING_FEE,
  absoluteUrl,
} from "@/lib/constants";
import type { MerchantFeedProduct } from "@/lib/queries";

/**
 * Google Merchant Center product feed.
 *
 * RSS 2.0 with Google's `g:` namespace — the format Merchant Center's
 * "Add products from file" scheduled fetch expects. XML rather than a
 * spreadsheet because the file is generated from the database on request: a
 * Google Sheet would be a second copy of the catalogue to keep in step by hand,
 * and the point of a scheduled fetch is that nobody has to.
 *
 * Attribute reference: https://support.google.com/merchants/answer/7052112
 */

/**
 * Our category slugs to Google's product taxonomy IDs.
 *
 * Taken from Google's published taxonomy, not guessed — a wrong ID is worse
 * than none, because Google stops inferring the category once you assert one.
 * Both leaf and parent slugs are listed so a product sitting directly on a
 * top-level category still resolves.
 *
 * Categories are admin-editable, so an unrecognised slug falls through to
 * `DEFAULT_GOOGLE_CATEGORY` rather than emitting nothing.
 */
const GOOGLE_PRODUCT_CATEGORIES: Record<string, number> = {
  // Hardware > Locks & Keys > Locks & Latches
  "facial-recognition-locks": 503730,
  "fingerprint-door-locks": 503730,
  "gate-jam-locks": 503730,
  "fingerprint-padlocks": 503730,
  // Hardware > Locks & Keys
  "smart-locks": 1974,
  "padlocks-portable-security": 1974,
  // Sporting Goods > … > Bicycle Accessories > Bicycle Locks
  "smart-u-locks": 1027,
  // Home & Garden > Business & Home Security > Home Alarm Systems
  "security-alarm-systems": 3873,
  "alarms-detection": 3873,
  // Home & Garden > Flood, Fire & Gas Safety > Smoke & Carbon Monoxide Detectors
  "smoke-gas-detectors": 499673,
  // Hardware > Power & Electrical Supplies > Electrical Switches > Light Switches
  "smart-switches": 1935,
  // Electronics > Audio > Audio Components > Speakers
  "ceiling-speakers": 249,
  audio: 249,
  // Hardware > Power & Electrical Supplies > Home Automation Kits
  "smart-curtain-kits": 2413,
  "smart-home-automation": 2413,
};

/** Hardware > Power & Electrical Supplies > Home Automation Kits. */
const DEFAULT_GOOGLE_CATEGORY = 2413;

/** Google's own caps. Longer values are rejected, not truncated for you. */
const MAX_TITLE = 150;
const MAX_DESCRIPTION = 5000;
/** Ten `additional_image_link`s on top of the required `image_link`. */
const MAX_ADDITIONAL_IMAGES = 10;

const TAB = 0x09;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;
const FIRST_PRINTABLE = 0x20;

/**
 * Drop the control characters XML 1.0 has no representation for.
 *
 * Tab, newline and carriage return are the only characters below 0x20 the spec
 * permits; the rest cannot be escaped either, not even as a numeric entity, so
 * removing them is the only option. Written as a code-point scan rather than a
 * regex because a character class of raw control bytes is invisible in a diff
 * and does not survive being copied between files.
 */
function stripForbiddenControlChars(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    const forbidden =
      code < FIRST_PRINTABLE &&
      code !== TAB &&
      code !== LINE_FEED &&
      code !== CARRIAGE_RETURN;
    if (!forbidden) out += char;
  }
  return out;
}

/**
 * XML-escape a value.
 *
 * A single stray `&` in a product name invalidates the whole document, and
 * Merchant Center reports that as "we couldn't process your file" without
 * naming the item that caused it — so every text node goes through here.
 */
function xml(value: string): string {
  return stripForbiddenControlChars(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Collapse whitespace and cut to `limit` without splitting a word. */
function clamp(value: string, limit: number): string {
  const flat = value.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;

  const cut = flat.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

/** `1299.00 ZAR` — Google wants the amount and the currency in one string. */
function money(amount: number): string {
  return `${amount.toFixed(2)} ${SITE.currency}`;
}

/** One element, indented. `indent` counts two-space levels. */
function tag(name: string, value: string | number, indent = 2): string {
  return `${"  ".repeat(indent)}<${name}>${xml(String(value))}</${name}>`;
}

/** Taxonomy ID for a product: leaf category, then parent, then the default. */
function googleCategory(product: MerchantFeedProduct): number {
  const leaf = GOOGLE_PRODUCT_CATEGORIES[product.categorySlug];
  if (leaf !== undefined) return leaf;

  const parent = product.parentCategorySlug
    ? GOOGLE_PRODUCT_CATEGORIES[product.parentCategorySlug]
    : undefined;

  return parent ?? DEFAULT_GOOGLE_CATEGORY;
}

/**
 * One `<item>`.
 *
 * Returns null for anything Google would reject outright — currently only a
 * product with no image, since `image_link` is required and an item without one
 * is a guaranteed disapproval rather than a listing.
 */
function item(product: MerchantFeedProduct): string | null {
  const [primaryImage, ...restImages] = product.images;
  if (!primaryImage) return null;

  /**
   * `price` is the list price and `sale_price` the discounted one — the
   * opposite way round from the database, where `price` is what's charged and
   * `compareAtPrice` is the struck-through original. Swapping them advertises a
   * discount that isn't offered, and Google cross-checks the landing page.
   */
  const listPrice =
    product.compareAtPrice !== null && product.compareAtPrice > product.price
      ? product.compareAtPrice
      : product.price;
  const onSale = listPrice !== product.price;

  /**
   * Declared per item so the feed works before shipping settings are
   * configured in Merchant Center.
   *
   * A product priced at or above the free-delivery threshold clears it on its
   * own, so quoting the flat fee against it would overstate the cost. Below it,
   * the flat fee is what a single-item order pays. Underquoting is the policy
   * violation, so anything that could go either way quotes the fee.
   */
  const shipping =
    product.price >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;

  const lines = [
    "  <item>",
    // The SKU, not the cuid: it survives a re-seed, and it's the code the shop
    // already uses when Merchant Center reports a problem with an item.
    tag("g:id", product.sku),
    tag("g:title", clamp(product.name, MAX_TITLE)),
    tag(
      "g:description",
      clamp(
        product.description || product.tagline || product.name,
        MAX_DESCRIPTION,
      ),
    ),
    tag("g:link", `${SITE.url}/products/${product.slug}`),
    tag("g:image_link", absoluteUrl(primaryImage)),
    ...restImages
      .slice(0, MAX_ADDITIONAL_IMAGES)
      .map((url) => tag("g:additional_image_link", absoluteUrl(url))),
    tag("g:availability", product.stock > 0 ? "in_stock" : "out_of_stock"),
    tag("g:price", money(listPrice)),
    ...(onSale ? [tag("g:sale_price", money(product.price))] : []),
    tag("g:condition", "new"),
    tag("g:google_product_category", googleCategory(product)),
    // Our own taxonomy, free-form. Google uses it for reporting and bidding
    // segments, so the parent > child path is more useful than the leaf alone.
    tag(
      "g:product_type",
      product.parentCategoryName
        ? `${product.parentCategoryName} > ${product.categoryName}`
        : product.categoryName,
    ),
  ];

  /**
   * Google wants `brand` together with a `gtin` or `mpn`. The SKU is a valid
   * MPN. Where no brand is recorded we say so explicitly rather than putting
   * the shop's own name in the field — Tados is the retailer, not the
   * manufacturer, and a wrong brand is a disapproval on a matched listing.
   */
  if (product.brandName) {
    lines.push(tag("g:brand", product.brandName), tag("g:mpn", product.sku));
  } else {
    lines.push(tag("g:identifier_exists", "no"));
  }

  lines.push(
    "    <g:shipping>",
    tag("g:country", SITE.address.country, 3),
    tag("g:service", `Standard (${DELIVERY_WINDOW})`, 3),
    tag("g:price", money(shipping), 3),
    "    </g:shipping>",
    "  </item>",
  );

  return lines.join("\n");
}

export interface MerchantFeed {
  xml: string;
  /** Items written. */
  included: number;
  /** Products left out — currently only those with no image. */
  skipped: number;
}

export function buildMerchantFeed(
  products: MerchantFeedProduct[],
): MerchantFeed {
  const items = products
    .map(item)
    .filter((entry): entry is string => entry !== null);

  const document = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    tag("title", SITE.name),
    tag("link", SITE.url),
    tag("description", SITE.description),
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return {
    xml: document,
    included: items.length,
    skipped: products.length - items.length,
  };
}
