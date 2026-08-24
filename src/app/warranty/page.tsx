import type { Metadata } from "next";
import Link from "next/link";

import {
  PolicyContact,
  PolicyPage,
  type PolicySection,
} from "@/components/policy/policy-page";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Warranty",
  description: `Warranty cover on ${SITE.name} products: your statutory rights under South African consumer law, manufacturer warranties, what is excluded, and how a claim is assessed.`,
  alternates: { canonical: "/warranty" },
};

const SECTIONS: PolicySection[] = [
  {
    heading: "Your statutory cover",
    blocks: [
      {
        type: "p",
        text: `Every purchase from ${SITE.name} is protected by applicable South African consumer law. Nothing in this policy limits or waives those rights.`,
      },
      {
        type: "note",
        title: "Why we don't advertise a single warranty period",
        text: "Cover is statutory first, and then extended by whatever the manufacturer of that specific device offers. Quoting one blanket term across the whole range would be wrong for some products and misleading for others, so the applicable period is stated per product instead.",
      },
    ],
  },
  {
    heading: "Manufacturer warranty",
    blocks: [
      {
        type: "p",
        text: "Certain products may include a manufacturer's warranty longer than the statutory minimum. Where one applies, the period may be stated:",
      },
      {
        type: "list",
        items: [
          "on the product page",
          "on the product packaging",
          "in the manufacturer's warranty documentation",
          "in documentation supplied with the product",
        ],
      },
      {
        type: "p",
        text: "Manufacturer warranty conditions differ between brands. Where appropriate, we will assist you with legitimate manufacturer warranty claims for products purchased from us.",
      },
    ],
  },
  {
    heading: "What may qualify as a product fault",
    blocks: [
      {
        type: "p",
        text: "Subject to inspection, warranty claims may include problems such as:",
      },
      {
        type: "list",
        items: [
          "hardware that does not power on despite correct installation",
          "defective sensors or controls",
          "internal component failure",
          "manufacturing defects",
          "failure of functionality specifically advertised as part of the product",
        ],
      },
    ],
  },
  {
    heading: "Compatibility is not the same as a fault",
    blocks: [
      {
        type: "p",
        text: "Many smart-home products depend on systems outside the device itself, including:",
      },
      {
        type: "list",
        items: [
          "Wi-Fi availability and signal strength",
          "supported Wi-Fi frequencies, such as 2.4 GHz or 5 GHz",
          "router settings and Bluetooth",
          "a compatible smartphone or tablet, and its Android or iOS version",
          "third-party applications",
          "Google Home, Amazon Alexa, Apple Home or another ecosystem",
          "neutral wiring or other electrical configuration, and sufficient power supply",
          "compatible locks, doors, switches, gates or appliances",
          "internet and cloud-service availability",
        ],
      },
      {
        type: "p",
        text: "A product is not necessarily defective merely because it is incompatible with equipment, wiring, network infrastructure or third-party software that the product was not represented as supporting.",
      },
      {
        type: "note",
        title: "Ask us before you order",
        text: (
          <>
            Please review the stated compatibility requirements before
            purchasing. If you are uncertain,{" "}
            <Link
              href="/contact"
              className="font-semibold text-brand-700 hover:underline"
            >
              contact us
            </Link>{" "}
            before ordering and we will help you work out whether a product suits
            your home.
          </>
        ),
      },
    ],
  },
  {
    heading: "Exclusions",
    blocks: [
      {
        type: "p",
        text: "To the extent permitted by law, a warranty generally does not cover damage or failure resulting from:",
      },
      {
        type: "list",
        items: [
          "accidental or physical damage after delivery",
          "misuse or abuse",
          "liquid or moisture exposure where the product is not designed for it",
          "power surges, lightning or electrical faults, or incorrect voltage",
          "improper wiring, or installation contrary to manufacturer instructions",
          "modification or unauthorised repair",
          "removal or alteration of serial numbers",
          "use outside specified operating conditions",
          "normal wear and tear",
          "batteries or consumable components after normal depletion",
          "damage caused by another device",
          "inadequate Wi-Fi or internet connectivity",
          "unsupported third-party software or platforms, or changes made by a third-party platform provider",
          "customer account or password issues unrelated to device hardware",
          "circumstances otherwise excluded under an applicable manufacturer's warranty",
        ],
      },
    ],
  },
  {
    heading: "Professional installation",
    blocks: [
      {
        type: "p",
        text: "Where a product requires connection to mains electricity or other specialised installation, please use an appropriately qualified person.",
      },
      {
        type: "p",
        text: (
          <>
            If we or one of our appointed technicians performs the installation,
            any complaint about the installation service itself is handled
            separately from a hardware warranty claim — see our{" "}
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
      {
        type: "p",
        text: "You do not automatically lose statutory rights merely because a product was installed by a third party. However, damage proven to have resulted from improper installation rather than a product defect may not constitute a product warranty claim.",
      },
    ],
  },
  {
    heading: "Software, apps and cloud services",
    blocks: [
      {
        type: "p",
        text: "Some products depend on software or online services operated by manufacturers or third parties. We do not control those platforms and cannot guarantee that they will indefinitely:",
      },
      {
        type: "list",
        items: [
          "maintain a particular app",
          "support every operating system",
          "retain particular features",
          "maintain integrations with other ecosystems",
          "operate their cloud services without interruption",
        ],
      },
    ],
  },
  {
    heading: "How a claim is assessed",
    blocks: [
      {
        type: "p",
        text: "Some claims require the product to be inspected. Assessment does not mean a claim has been rejected — it lets us determine whether the problem relates to:",
      },
      {
        type: "list",
        items: [
          "product hardware",
          "installation",
          "configuration or compatibility",
          "software",
          "network conditions",
          "physical or customer-caused damage",
        ],
      },
      {
        type: "p",
        text: (
          <>
            To start a claim, contact us with your order number and a description
            of the problem. The return process is set out in our{" "}
            <Link
              href="/returns"
              className="font-semibold text-brand-700 hover:underline"
            >
              Returns, Exchanges &amp; Refunds Policy
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "Data on returned smart devices",
    blocks: [
      {
        type: "p",
        text: "Before returning a product, please remove personal information and unlink it from your smart-home accounts where reasonably possible. That usually means:",
      },
      {
        type: "list",
        items: [
          "deleting stored recordings",
          "removing Wi-Fi credentials",
          "performing a factory reset",
          "removing the device from Google Home, Alexa, Apple Home or another ecosystem",
          "unlinking manufacturer cloud accounts",
        ],
      },
      {
        type: "note",
        text: `${SITE.name} cannot guarantee preservation of data stored on a device submitted for repair or replacement.`,
      },
    ],
  },
];

export default function WarrantyPage() {
  return (
    <PolicyPage
      eyebrow="Warranty"
      title="Warranty"
      intro={`${SITE.name} is committed to supplying smart-home products that are fit for their intended purpose, of appropriate quality and in good working order. This policy explains what is covered, what isn't, and how a claim is handled.`}
      sections={SECTIONS}
    >
      <PolicyContact
        heading="Start a warranty claim"
        email={SITE.returnsEmail}
      />
    </PolicyPage>
  );
}
