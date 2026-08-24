import type { Metadata } from "next";
import Link from "next/link";

import {
  PolicyContact,
  PolicyPage,
  type PolicySection,
} from "@/components/policy/policy-page";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Returns, Exchanges & Refunds",
  description: `How to return a product to ${SITE.name}: defective items, wrong products supplied, transit damage, return authorisation, packaging and refund method.`,
  alternates: { canonical: "/returns" },
};

const SECTIONS: PolicySection[] = [
  {
    heading: "Defective products",
    blocks: [
      {
        type: "p",
        text: "If your product is defective, unsafe or otherwise fails to meet applicable standards of quality, please notify us as soon as possible with your order number and a description of the problem.",
      },
      {
        type: "p",
        text: (
          <>
            What counts as a product fault, and what is excluded, is set out in
            our{" "}
            <Link
              href="/warranty"
              className="font-semibold text-brand-700 hover:underline"
            >
              warranty policy
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "Products that are not defective",
    blocks: [
      {
        type: "p",
        text: "A return based solely on incompatibility may be treated differently from a defective-product return, where the compatibility requirement was clearly disclosed before purchase. Examples include buying:",
      },
      {
        type: "list",
        items: [
          "a Wi-Fi device requiring 2.4 GHz where your network cannot support it",
          "a switch requiring neutral wiring, for premises without neutral wiring",
          "an accessory intended for one smart-home ecosystem, for use with an unsupported ecosystem",
          "a product whose dimensions or fittings do not match the intended installation",
        ],
      },
      {
        type: "note",
        title: "This is avoidable",
        text: (
          <>
            Compatibility is the single most common reason for a return.{" "}
            <Link
              href="/contact"
              className="font-semibold text-brand-700 hover:underline"
            >
              Ask us before you buy
            </Link>{" "}
            — tell us what you want to control and what equipment you already
            have, and we&apos;ll tell you whether it will work.
          </>
        ),
      },
    ],
  },
  {
    heading: "Wrong product supplied",
    blocks: [
      {
        type: "p",
        text: `If ${SITE.name} sends you a product different from the one ordered, please notify us immediately.`,
      },
      {
        type: "p",
        text: "We will arrange collection or return at our expense and provide the correct product or another appropriate remedy.",
      },
    ],
  },
  {
    heading: "Products damaged in transit",
    blocks: [
      {
        type: "p",
        text: "If a product appears to have been damaged during transport, photograph:",
      },
      {
        type: "list",
        items: [
          "the courier packaging",
          "the shipping label",
          "the product packaging",
          "the damaged item",
        ],
      },
      {
        type: "p",
        text: (
          <>
            Then contact us immediately so we can arrange assessment and, where
            appropriate, replacement or refund. Our{" "}
            <Link
              href="/shipping"
              className="font-semibold text-brand-700 hover:underline"
            >
              shipping policy
            </Link>{" "}
            explains what to check on delivery.
          </>
        ),
      },
    ],
  },
  {
    heading: "Return authorisation",
    blocks: [
      {
        type: "p",
        text: (
          <>
            Before sending a product back, contact us at{" "}
            <a
              href={`mailto:${SITE.returnsEmail}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {SITE.returnsEmail}
            </a>{" "}
            or on WhatsApp.
          </>
        ),
      },
      {
        type: "p",
        text: "We may issue a return reference number and instructions covering:",
      },
      {
        type: "list",
        items: [
          "courier collection",
          "drop-off",
          "packaging",
          "included accessories",
          "account unlinking and factory reset",
        ],
      },
      {
        type: "note",
        title: "Unscheduled returns are not accepted",
        text: "A parcel sent back without a return reference cannot be matched to your order, which delays the outcome for you. Please contact us first.",
      },
    ],
  },
  {
    heading: "Packaging a return",
    blocks: [
      {
        type: "p",
        text: "Returned products should be securely packed to prevent damage in transit. Please include all:",
      },
      {
        type: "list",
        items: [
          "cables, adaptors and power supplies",
          "brackets and mounting hardware",
          "remotes and sensors",
          "batteries supplied with the product",
          "manuals and other original accessories",
        ],
      },
    ],
  },
  {
    heading: "Refund method",
    blocks: [
      {
        type: "p",
        text: "Approved refunds are returned using the original payment method.",
      },
      {
        type: "p",
        text: `Bank and payment-provider processing times are outside ${SITE.name}'s direct control once a refund has been released.`,
      },
      {
        type: "note",
        text: "Orders are charged in South African rand. Where a price was displayed to you in another currency as a guide, the refund is the rand amount actually charged.",
      },
    ],
  },
  {
    heading: "Installation charges",
    blocks: [
      {
        type: "p",
        text: "Product returns and installation-service charges are separate matters.",
      },
      {
        type: "p",
        text: (
          <>
            Where an installation service has already been properly completed,
            the installation charge may not be refundable. See our{" "}
            <Link
              href="/installation"
              className="font-semibold text-brand-700 hover:underline"
            >
              Installation Support Policy
            </Link>
            .
          </>
        ),
      },
    ],
  },
];

export default function ReturnsPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Returns & Refunds"
      title="Returns & Refunds"
      intro="We want you to buy smart-home technology with confidence. This policy explains how returns, exchanges and refunds are handled, and what to do first in each case."
      sections={SECTIONS}
    >
      <PolicyContact heading="Start a return" email={SITE.returnsEmail} />
    </PolicyPage>
  );
}
