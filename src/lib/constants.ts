/**
 * Site-wide constants.
 *
 * The category taxonomy is derived directly from the supplied product sheet
 * (10 product lines). Products are smart-home / security IoT devices, so the
 * tree is organised by *job to be done* rather than by device type — that is
 * how customers actually shop ("I want to secure my door") and it keeps every
 * top-level category populated instead of leaving thin one-product buckets.
 */

export const SITE = {
  name: "Tados Web",
  shortName: "Tados",
  description:
    "South Africa's smart security and automation store. Shop smart door locks, facial recognition locks, alarm systems, smart switches, ceiling speakers and curtain kits with fast delivery and secure PayFast checkout.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_ZA",
  currency: "ZAR",
  twitter: "@tadosweb",
  email: "support@tadosweb.co.za",
  phone: "+27 11 000 0000",
  address: {
    street: "12 Innovation Drive",
    city: "Johannesburg",
    province: "Gauteng",
    postalCode: "2196",
    country: "ZA",
  },
} as const;

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

/** Free delivery above this rand value. */
export const FREE_SHIPPING_THRESHOLD = 1500;
export const STANDARD_SHIPPING_FEE = 120;
/** South African VAT, already included in displayed prices. */
export const VAT_RATE = 0.15;

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

export const TRUST_BADGES = [
  {
    icon: "Truck",
    title: "Free shipping over R1 500",
    description: "Nationwide delivery in 2–4 working days",
  },
  {
    icon: "ShieldCheck",
    title: "2-year warranty",
    description: "Manufacturer-backed on every device",
  },
  {
    icon: "RotateCcw",
    title: "30-day returns",
    description: "Free and easy return policy",
  },
] as const;
