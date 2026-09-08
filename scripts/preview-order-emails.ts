/**
 * Render every order email to disk without sending anything.
 *
 *   npm run email:preview
 *
 * Writes to .email-preview/ — open the .html files in a browser to check the
 * layout, and read the .txt files to check the plain-text part (the one most
 * email templates get wrong, because nobody ever looks at it).
 *
 * Two fixtures, because the branches are where these templates break: a
 * registered customer with delivery notes and paid shipping, and a guest checkout
 * with free shipping and no notes. Each is rendered as both pairs — paid
 * (`*-paid`) and awaiting payment (`*-request`) — so the claim each email makes
 * about the money can be checked side by side.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAdminEmail,
  buildCustomerEmail,
  type OrderForEmail,
  type RenderedEmail,
} from "../src/lib/order-email-templates";
import {
  buildAdminRequestEmail,
  buildCustomerRequestEmail,
} from "../src/lib/order-request-email-templates";

const OUT_DIR = join(process.cwd(), ".email-preview");

// Fixed, so re-running the script produces a byte-identical diff when the
// templates haven't changed.
const PLACED_AT = new Date("2026-08-28T14:32:00+02:00");

const registered: OrderForEmail = {
  id: "clx0preview0registered",
  orderNumber: "ORD-20260828-0417",
  email: "n.mokoena@example.co.za",
  phone: "+27 82 555 0134",
  status: "PROCESSING",
  notes: "Complex has a boom gate — please call me when the driver is close.",
  subtotal: 18_480,
  shipping: 450,
  tax: 0,
  discount: 1_200,
  total: 17_730,
  createdAt: PLACED_AT,
  userId: "usr_preview_registered",
  user: { name: "Naledi Mokoena", email: "n.mokoena@example.co.za" },
  address: {
    firstName: "Naledi",
    lastName: "Mokoena",
    phone: "+27 82 555 0134",
    line1: "14 Ridgeview Close",
    line2: "Unit 3B",
    city: "Sandton",
    province: "Gauteng",
    postalCode: "2196",
    country: "South Africa",
  },
  items: [
    {
      id: "itm_1",
      name: "Tados Smart Door Lock — Fingerprint & Keypad",
      sku: "TDS-LOCK-FP200",
      price: 6_990,
      quantity: 2,
    },
    {
      id: "itm_2",
      name: "Tados Video Doorbell 2K with Chime",
      sku: "TDS-BELL-2K",
      price: 4_500,
      quantity: 1,
    },
  ],
  payment: {
    provider: "PAYFAST",
    status: "COMPLETE",
    pfPaymentId: "1789234",
    amount: 17_730,
  },
};

const guest: OrderForEmail = {
  id: "clx0preview0guest",
  orderNumber: "ORD-20260828-0418",
  email: "thabo@example.com",
  phone: null,
  status: "PROCESSING",
  notes: null,
  subtotal: 2_150,
  shipping: 0,
  tax: 0,
  discount: 0,
  total: 2_150,
  createdAt: PLACED_AT,
  userId: null,
  user: null,
  address: {
    firstName: "Thabo",
    lastName: "Dlamini",
    phone: "+27 71 555 0198",
    line1: "88 Long Street",
    line2: null,
    city: "Cape Town",
    province: "Western Cape",
    postalCode: "8001",
    country: "South Africa",
  },
  items: [
    {
      id: "itm_3",
      name: "Tados Smart Plug (2-pack)",
      sku: "TDS-PLUG-16A",
      price: 2_150,
      quantity: 1,
    },
  ],
  payment: {
    provider: "PAYFAST",
    status: "COMPLETE",
    pfPaymentId: "1789235",
    amount: 2_150,
  },
};

const FIXTURES = [
  { slug: "registered", order: registered },
  { slug: "guest", order: guest },
] as const;

/**
 * The same order rewound to the moment before payment.
 *
 * The request templates don't read the payment row, but the preview should still
 * describe an order that could actually exist — PENDING, provider `manual`, no
 * PayFast id — so a future field added to those templates renders honestly here.
 */
function awaitingPayment(order: OrderForEmail): OrderForEmail {
  return {
    ...order,
    status: "PENDING",
    payment: {
      provider: "manual",
      status: "PENDING",
      pfPaymentId: null,
      amount: order.total,
    },
  };
}

const PAIRS = [
  {
    suffix: "paid",
    prepare: (order: OrderForEmail) => order,
    templates: [
      ["customer", buildCustomerEmail],
      ["admin", buildAdminEmail],
    ],
  },
  {
    suffix: "request",
    prepare: awaitingPayment,
    templates: [
      ["customer", buildCustomerRequestEmail],
      ["admin", buildAdminRequestEmail],
    ],
  },
] as const satisfies readonly {
  suffix: string;
  prepare: (order: OrderForEmail) => OrderForEmail;
  templates: readonly (readonly [string, (o: OrderForEmail) => RenderedEmail])[];
}[];

mkdirSync(OUT_DIR, { recursive: true });

for (const { slug, order } of FIXTURES) {
  for (const { suffix, prepare, templates } of PAIRS) {
    const prepared = prepare(order);

    for (const [audience, build] of templates) {
      const rendered = build(prepared);
      const base = `${audience}-${slug}-${suffix}`;

      writeFileSync(join(OUT_DIR, `${base}.html`), rendered.html, "utf8");
      writeFileSync(
        join(OUT_DIR, `${base}.txt`),
        `Subject: ${rendered.subject}\n\n${rendered.text}`,
        "utf8",
      );

      console.log(`${base.padEnd(30)} ${rendered.subject}`);
    }
  }
}

console.log(`\nWritten to ${OUT_DIR}`);
