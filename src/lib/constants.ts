/**
 * Site-wide constants.
 *
 * The category taxonomy is derived directly from the supplied product sheet
 * (10 product lines). Products are smart-home / security IoT devices, so the
 * tree is organised by *job to be done* rather than by device type — that is
 * how customers actually shop ("I want to secure my door") and it keeps every
 * top-level category populated instead of leaving thin one-product buckets.
 */

/**
 * The live domain, as bought. Hard-coded as the production fallback rather than
 * left to an environment variable alone, because the failure is silent: with
 * `NEXT_PUBLIC_SITE_URL` unset in a deployment, every canonical tag, JSON-LD
 * `@id` and sitemap entry claimed `http://localhost:3000` while the pages
 * themselves looked perfect. A crawler can't reach that, and nothing in the UI
 * shows it's wrong.
 */
const PRODUCTION_ORIGIN = "https://www.tadossmarttech.com";

/**
 * Google Analytics 4 measurement ID.
 *
 * Not a secret — it ships in the page source of every GA-tracked site on the
 * web, and restricting it would stop the tag working at all. Kept here rather
 * than inline in the layout so the value appears exactly once.
 */
export const GA_MEASUREMENT_ID = "G-9JTZH07RV2";

/**
 * The canonical origin — absolute, and never with a trailing slash.
 *
 * Paths are concatenated onto this everywhere (`${SITE.url}/products`), so one
 * stray slash in the environment variable becomes `https://site.co.za//products`
 * across the whole site at once — which Google reads as a different URL from the
 * one meant, on every page, including the sitemap it's told to trust.
 */
function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  // Only a local dev server has any business calling itself localhost.
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : PRODUCTION_ORIGIN;
}

export const SITE = {
  name: "Tados Smart Technology",
  /** For tight spaces — the header lockup, breadcrumbs, order emails. */
  shortName: "Tados",
  /** The brand line from the About copy. Used as the logo sub-lockup. */
  tagline: "Smarter products. Simpler homes.",
  /** Longer positioning line, for the hero and About page. */
  promise: "Smart Living Made Simple",
  description:
    "South African smart-home technology. Shop smart door locks, facial recognition locks, alarm systems, smart switches, ceiling speakers and curtain kits, with nationwide delivery and secure PayFast checkout.",
  url: siteOrigin(),
  locale: "en_ZA",
  /** The settlement currency. Display currency is per-visitor — see lib/currency.ts. */
  currency: "ZAR",
  twitter: "@tadossmart",
  email: "tadosexcelsolutions@gmail.com",
  salesEmail: "tadosexcelsolutions@gmail.com",
  returnsEmail: "tadosexcelsolutions@gmail.com",
  privacyEmail: "tadosexcelsolutions@gmail.com",
  phone: "+277 356 98203",
  /**
   * WhatsApp destination for installation requests, digits only with country
   * code — wa.me rejects spaces and a leading +.
   *
   * Placeholder until the real number is supplied: set
   * NEXT_PUBLIC_WHATSAPP_NUMBER in .env and every surface picks it up.
   */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "27735698203",
  operatingHours: "Mon–Sat, 08:00–17:00 SAST",
  /**
   * Where the business operates. Kept as a list because it appears in the
   * footer, contact page, About, FAQ and the Installation Support Policy — one
   * source stops those drifting apart.
   */
  cities: ["Pretoria", "Durban"] as const,
  address: {
    city: "Pretoria",
    province: "Gauteng",
    country: "ZA",
  },
} as const;

/** "Pretoria and Durban" — for sentences. */
export const CITIES_SENTENCE = "Pretoria, Johannesburg and Durban";
/** "Pretoria | Durban" — for the About page's location strip. */
export const CITIES_DIVIDED = SITE.cities.join(" | ");

/**
 * A wa.me link with a pre-filled message.
 *
 * wa.me wants digits only — no `+`, no spaces — and the text URL-encoded. Both
 * are easy to get wrong by hand, so every WhatsApp entry point goes through here.
 */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${SITE.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Category tree — the reference taxonomy.
 *
 * level 1 = navigation dropdown headings
 * level 2 = the actual product buckets
 *
 * No longer read by the header, footer or homepage: those go through
 * `getCategoryTree()` so an admin's changes show up without a deploy. This
 * stays as the shape `prisma/seed.ts` builds from, and as the canonical list
 * when you need the taxonomy without a database.
 */
export const CATEGORY_TREE = [
  {
    name: "Smart Locks",
    slug: "smart-locks",
    icon: "Lock",
    featured: true,
    description:
      "Keyless entry for homes, offices and estates — facial recognition, fingerprint, PIN, RFID and app control with mechanical key backup.",
    children: [
      {
        name: "Facial Recognition Locks",
        slug: "facial-recognition-locks",
        icon: "ScanFace",
        description:
          "3D face unlock in 1–2 seconds, works in low light, with anti-spoof protection that rejects photos and video.",
      },
      {
        name: "Fingerprint Door Locks",
        slug: "fingerprint-door-locks",
        icon: "Fingerprint",
        description:
          "Semiconductor 360° fingerprint sensors with multi-user registration, access history and auto-lock.",
      },
      {
        name: "Gate & JAM Locks",
        slug: "gate-jam-locks",
        icon: "DoorClosed",
        description:
          "Heavy-duty remote-controlled locking for entrance gates, apartment blocks and commercial doors.",
      },
    ],
  },
  {
    name: "Padlocks & Portable Security",
    slug: "padlocks-portable-security",
    icon: "KeyRound",
    featured: true,
    description:
      "Take your security with you — biometric padlocks and smart U-locks for bikes, lockers, storage and outdoor equipment.",
    children: [
      {
        name: "Fingerprint Padlocks",
        slug: "fingerprint-padlocks",
        icon: "Fingerprint",
        description:
          "Unlock in under a second with hardened steel shackles, IP-rated weather resistance and app-managed users.",
      },
      {
        name: "Smart U-Locks",
        slug: "smart-u-locks",
        icon: "Bike",
        description:
          "GPS-tracked bicycle and scooter U-locks with tamper alarms, geofencing and Bluetooth unlocking.",
      },
    ],
  },
  {
    name: "Alarms & Detection",
    slug: "alarms-detection",
    icon: "ShieldAlert",
    featured: true,
    description:
      "Detect intrusion, smoke and gas early — with instant push alerts wherever you are.",
    children: [
      {
        name: "Security Alarm Systems",
        slug: "security-alarm-systems",
        icon: "Siren",
        description:
          "Complete kits with door/window contacts, motion sensors, sirens and remote arm/disarm from your phone.",
      },
      {
        name: "Smoke & Gas Detectors",
        slug: "smoke-gas-detectors",
        icon: "Flame",
        description:
          "Interconnected smart smoke alarms with self-testing, low-battery alerts and smartphone notifications.",
      },
    ],
  },
  {
    name: "Smart Home Automation",
    slug: "smart-home-automation",
    icon: "Home",
    featured: true,
    description:
      "Wi-Fi and Zigbee devices that automate lighting, curtains and daily routines — with Alexa and Google Assistant support.",
    children: [
      {
        name: "Smart Switches",
        slug: "smart-switches",
        icon: "ToggleRight",
        description:
          "Wi-Fi switches for simple setups and Zigbee mesh switches for large homes with many devices.",
      },
      {
        name: "Smart Curtain Kits",
        slug: "smart-curtain-kits",
        icon: "Blinds",
        description:
          "Motorised curtain tracks with scheduling, voice control and manual-pull override.",
      },
    ],
  },
  {
    name: "Audio",
    slug: "audio",
    icon: "Speaker",
    featured: true,
    description:
      "Discreet in-ceiling speakers with Wi-Fi and Bluetooth streaming, multi-room grouping and TV audio input.",
    children: [
      {
        name: "Ceiling Speakers",
        slug: "ceiling-speakers",
        icon: "Speaker",
        description:
          "Wi-Fi/Bluetooth in-ceiling speakers for homes, restaurants, hotels and retail spaces.",
      },
    ],
  },
] as const;

/** Flat list of every leaf slug — handy for validation and sitemaps. */
export const LEAF_CATEGORY_SLUGS = CATEGORY_TREE.flatMap((parent) =>
  parent.children.map((child) => child.slug),
);

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top rated" },
  { value: "name", label: "Name: A–Z" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const PRODUCTS_PER_PAGE = 12;

/**
 * Shipping economics.
 *
 * The threshold still exists because checkout has to price delivery, but no
 * customer-facing surface advertises "free shipping over R…" any more — the
 * Shipping Policy makes any free-delivery promotion conditional, so promising it
 * in a header badge would contradict the policy. `FREE_SHIPPING_THRESHOLD` is
 * now purely an internal pricing rule.
 */
export const FREE_SHIPPING_THRESHOLD = 1500;
export const STANDARD_SHIPPING_FEE = 120;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PAID: "bg-brand-50 text-brand-700 ring-brand-600/20",
  PROCESSING: "bg-blue-50 text-blue-700 ring-blue-600/20",
  SHIPPED: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  DELIVERED: "bg-brand-50 text-brand-700 ring-brand-600/20",
  CANCELLED: "bg-red-50 text-red-700 ring-red-600/20",
  REFUNDED: "bg-ink-100 text-ink-700 ring-ink-600/20",
};

/**
 * The three reassurance tiles in the footer and on product pages.
 *
 * Deliberately free of numbers we can't stand behind: the delivery window is
 * the one in the Shipping Policy, and the warranty tile no longer claims a
 * fixed term because cover is statutory plus whatever the manufacturer offers,
 * which varies per product. `href` sends a curious shopper to the policy that
 * governs the claim rather than leaving it as decoration.
 */
export const TRUST_BADGES = [
  {
    icon: "Truck",
    title: "Nationwide delivery",
    description: "Anywhere in South Africa in 3–7 working days",
    href: "/shipping",
  },
  {
    icon: "ShieldCheck",
    title: "Warranty",
    description: "Statutory cover plus manufacturer warranty where applicable",
    href: "/warranty",
  },
  {
    icon: "RotateCcw",
    title: "Returns & exchanges",
    description: "Clear process for defective, wrong or damaged items",
    href: "/returns",
  },
] as const;

/**
 * The one place the delivery window is written.
 *
 * Item 6 of the client's corrections: the "free shipping over R1 500" claim is
 * gone and this is what replaces it everywhere. Matching the Shipping Policy
 * exactly ("3–7 business days") matters — a badge promising something shorter
 * than the policy is the kind of mismatch that turns into a CPA complaint.
 */
export const DELIVERY_PROMISE = "Nationwide delivery in 3–7 working days";
export const DELIVERY_WINDOW = "3–7 working days";

/**
 * Legal and support pages, grouped as the footer renders them.
 *
 * Every entry has a real page behind it. Previously the footer linked to seven
 * routes that did not exist, so a shopper looking for the returns policy hit a
 * 404 — which is worse than not linking it at all.
 */
export const POLICY_PAGES = [
  { label: "Shipping Policy", href: "/shipping" },
  { label: "Warranty", href: "/warranty" },
  { label: "Returns & Refunds", href: "/returns" },
  { label: "Installation Support", href: "/installation" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "FAQs", href: "/faqs" },
] as const;

/**
 * Shown at the top of every policy page.
 *
 * Hardcoded rather than `new Date()` — a "last updated" that silently tracks
 * today's date is worse than none: it tells a customer the terms changed when
 * they didn't, and it makes the page non-deterministic to prerender. Bump it by
 * hand when a policy actually changes.
 */
export const POLICY_LAST_UPDATED = "August 2026";
