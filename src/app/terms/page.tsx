import type { Metadata } from "next";
import Link from "next/link";

import {
  PolicyContact,
  PolicyPage,
  type PolicySection,
} from "@/components/policy/policy-page";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms that govern your use of the ${SITE.name} website and any purchase made through it, including orders, pricing, payment, liability and the smart-home technology disclaimer.`,
  alternates: { canonical: "/terms" },
};

/** Reused three times below — the policies that form part of these Terms. */
function PolicyLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="font-semibold text-brand-700 hover:underline">
      {children}
    </Link>
  );
}

const SECTIONS: PolicySection[] = [
  {
    heading: "Website use",
    blocks: [
      {
        type: "p",
        text: "You may use this website for lawful purposes, including viewing products, creating an account, purchasing products, requesting assistance, arranging installation where available, and communicating with us.",
      },
      { type: "p", text: "You may not knowingly:" },
      {
        type: "list",
        items: [
          "interfere with website security",
          "attempt unauthorised access",
          "introduce malicious software",
          "use fraudulent payment information",
          "impersonate another person",
          "scrape the site in a way that materially interferes with its operation",
          "use the website for unlawful purposes",
        ],
      },
    ],
  },
  {
    heading: "User accounts",
    blocks: [
      {
        type: "p",
        text: "Certain website functionality may require registration. You are responsible for providing accurate information, keeping your login credentials confidential, and notifying us if you reasonably suspect unauthorised access to your account.",
      },
      {
        type: "p",
        text: "We may suspend accounts reasonably suspected of fraudulent, abusive or unlawful activity.",
      },
    ],
  },
  {
    heading: "Product information and images",
    blocks: [
      {
        type: "p",
        text: "We make reasonable efforts to display product descriptions, specifications, images and compatibility information accurately. Manufacturers may, however, occasionally alter packaging, update firmware, change specifications, modify apps, revise product appearance or change integrations.",
      },
      {
        type: "p",
        text: "Images are intended to represent products as accurately as reasonably possible. Screen settings, packaging changes and manufacturer revisions may result in minor visual differences that would not materially alter the product.",
      },
      {
        type: "note",
        title: "Check compatibility before you buy",
        text: (
          <>
            Compatibility requirements matter more with smart-home hardware than
            with almost anything else. If you are uncertain,{" "}
            <PolicyLink href="/contact">ask us first</PolicyLink> — it takes a
            minute and saves a return.
          </>
        ),
      },
    ],
  },
  {
    heading: "Pricing",
    blocks: [
      {
        type: "p",
        text: "Prices are displayed on the website and will indicate VAT treatment as applicable. The price applicable to an order is the price presented at checkout, subject to correction of obvious errors.",
      },
      {
        type: "note",
        title: "Prices shown in another currency are a guide",
        text: `Where your prices are displayed in a currency other than South African rand, that figure is an indicative conversion. Every order is charged and settled in rand, and the rand amount is shown at checkout before you pay.`,
      },
      {
        type: "p",
        text: "While we take care to ensure prices are correct, errors may occasionally occur. Where a price is clearly erroneous, we may contact you before fulfilment to explain the error and provide the available options.",
      },
    ],
  },
  {
    heading: "Orders",
    blocks: [
      {
        type: "p",
        text: "Submitting an order constitutes an offer to purchase the selected goods.",
      },
      {
        type: "p",
        text: "Receipt of an automated acknowledgement does not necessarily mean an order has been finally accepted where payment verification, fraud checks or stock confirmation remain outstanding.",
      },
    ],
  },
  {
    heading: "Stock availability",
    blocks: [
      { type: "p", text: "Products are offered subject to availability." },
      {
        type: "p",
        text: "If an item becomes unavailable after ordering, we will contact you and provide an appropriate refund, alternative or other lawful option. We will not substitute a materially different item without your agreement.",
      },
    ],
  },
  {
    heading: "Payment",
    blocks: [
      {
        type: "p",
        text: "Available payment methods are displayed at checkout. Payment processing may be performed by secure third-party payment-service providers.",
      },
      {
        type: "p",
        text: `${SITE.name} does not intend to store full card details unless expressly stated and lawfully implemented.`,
      },
    ],
  },
  {
    heading: "Delivery, returns and warranty",
    blocks: [
      {
        type: "p",
        text: (
          <>
            Delivery is governed by our{" "}
            <PolicyLink href="/shipping">Shipping Policy</PolicyLink>, and
            returns, refunds and warranties by our{" "}
            <PolicyLink href="/returns">
              Returns, Exchanges &amp; Refunds Policy
            </PolicyLink>{" "}
            and <PolicyLink href="/warranty">Warranty Policy</PolicyLink>. Each
            forms part of these Terms.
          </>
        ),
      },
      {
        type: "note",
        text: "Nothing in these Terms is intended to waive mandatory consumer rights.",
      },
    ],
  },
  {
    heading: "Installation",
    blocks: [
      {
        type: "p",
        text: (
          <>
            Installation services are governed by our{" "}
            <PolicyLink href="/installation">
              Installation Support Policy
            </PolicyLink>{" "}
            and any quotation or scope of work you accept.
          </>
        ),
      },
      {
        type: "p",
        text: "Installation is not automatically included in the purchase price of a product.",
      },
    ],
  },
  {
    heading: "Smart-home technology disclaimer",
    blocks: [
      {
        type: "p",
        text: "Smart-home products may depend upon compatible:",
      },
      {
        type: "list",
        items: [
          "electrical systems",
          "routers and Wi-Fi networks",
          "internet access",
          "phones and operating systems",
          "third-party applications",
          "cloud platforms",
          "smart-home ecosystems",
        ],
      },
      {
        type: "p",
        text: `Customers should review stated technical requirements carefully. ${SITE.name} does not control independent third-party service providers and therefore cannot guarantee uninterrupted availability of their platforms.`,
      },
    ],
  },
  {
    heading: "Home-security products",
    blocks: [
      {
        type: "p",
        text: "Smart cameras, alarms, sensors, locks and related products may assist with security but should not be understood as guaranteeing that burglary, theft, property damage, injury or other incidents cannot occur.",
      },
      {
        type: "p",
        text: "Customers remain responsible for determining whether their overall security arrangements are appropriate to their circumstances.",
      },
    ],
  },
  {
    heading: "Internet and power outages",
    blocks: [
      {
        type: "p",
        text: "The functionality of some products may be reduced during load shedding, power failures, internet outages, router failures, cloud outages or telecommunications disruptions.",
      },
      {
        type: "note",
        title: "Planning for load shedding",
        text: "Customers requiring continuity should consider appropriate backup power and connectivity solutions — a mains-powered device will lose power with the rest of the house, and a battery-powered device still needs a live router for remote alerts.",
      },
    ],
  },
  {
    heading: "Intellectual property",
    blocks: [
      {
        type: "p",
        text: `Unless otherwise indicated, website content belonging to ${SITE.name} — including branding, original text, graphics and site design — may not be reproduced commercially without permission.`,
      },
      {
        type: "p",
        text: "Third-party trademarks and product names belong to their respective owners.",
      },
    ],
  },
  {
    heading: "Reviews and user content",
    blocks: [
      {
        type: "p",
        text: "Where customers submit reviews, photographs or other content, they must not submit material that:",
      },
      {
        type: "list",
        items: [
          "infringes another person's rights",
          "is knowingly false or defamatory",
          "contains unlawful content",
          "contains malicious code",
          "discloses another person's private information without permission",
        ],
      },
      {
        type: "p",
        text: "We may moderate content where reasonably necessary.",
      },
    ],
  },
  {
    heading: "Promotions",
    blocks: [
      {
        type: "p",
        text: "Discounts, promotional codes and competitions may have separate conditions, including validity periods, product exclusions, minimum order values and limits per customer.",
      },
      {
        type: "p",
        text: "Where promotional terms conflict with these Terms, the specific promotional terms apply to that promotion.",
      },
    ],
  },
  {
    heading: "Limitation of liability",
    blocks: [
      {
        type: "p",
        text: `To the fullest extent permitted by South African law, ${SITE.name} will not be liable for losses caused solely by circumstances outside its reasonable control, third-party service interruptions or customer misuse.`,
      },
    ],
  },
  {
    heading: "Privacy",
    blocks: [
      {
        type: "p",
        text: (
          <>
            Personal information collected through the website is processed in
            accordance with our{" "}
            <PolicyLink href="/privacy">Privacy Policy</PolicyLink> and POPIA.
          </>
        ),
      },
    ],
  },
  {
    heading: "Changes to these Terms",
    blocks: [
      { type: "p", text: "We may update these Terms from time to time." },
      {
        type: "p",
        text: "The version applicable to a purchase will generally be the version in effect when the relevant transaction took place, except where changes are required by law.",
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Terms & Conditions"
      title="Terms & Conditions"
      intro={`These Terms and Conditions govern your use of the ${SITE.name} website and purchases made through it. Our Shipping, Warranty, Returns and Installation Support policies form part of them.`}
      sections={SECTIONS}
    >
      <PolicyContact heading="Questions about these Terms?" />
    </PolicyPage>
  );
}
