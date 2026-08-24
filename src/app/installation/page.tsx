import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import {
  PolicyContact,
  PolicyPage,
  type PolicySection,
} from "@/components/policy/policy-page";
import { CITIES_SENTENCE, SITE, whatsappLink } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Installation Support",
  description: `${SITE.name} offers installation support for selected smart-home products in ${CITIES_SENTENCE}. What we fit, what a quote depends on, and what we need from you on site.`,
  alternates: { canonical: "/installation" },
};

const SECTIONS: PolicySection[] = [
  {
    heading: "Where we install",
    blocks: [
      {
        type: "p",
        text: (
          <>
            Installation support is available in{" "}
            <strong className="font-semibold text-ink-900">
              {CITIES_SENTENCE}, South Africa
            </strong>
            , subject to technician availability and your exact location. We aim
            to expand this footprint as the business grows.
          </>
        ),
      },
      {
        type: "note",
        title: "Outside those areas?",
        text: (
          <>
            You can still buy from us — we deliver nationwide. We&apos;ll provide
            remote setup guidance, manufacturer documentation and reasonable
            telephone or WhatsApp assistance, and you&apos;re welcome to arrange
            your own suitably qualified installer.
          </>
        ),
      },
    ],
  },
  {
    heading: "Products eligible for installation",
    blocks: [
      { type: "p", text: "Installation support may be available for selected:" },
      {
        type: "list",
        items: [
          "smart switches and sockets",
          "smart lighting",
          "cameras and doorbells",
          "sensors",
          "smart locks",
          "controllers and hubs",
          "automation devices",
          "other supported products",
        ],
      },
      {
        type: "p",
        text: "Not every product requires or qualifies for installation support — many are designed for straightforward DIY fitting.",
      },
    ],
  },
  {
    heading: "Installation is a separate service",
    blocks: [
      {
        type: "p",
        text: "Unless expressly stated otherwise on the product page or a quotation, the price of a product does not include installation.",
      },
      { type: "p", text: "Installation charges depend on factors such as:" },
      {
        type: "list",
        items: [
          "product type and number of devices",
          "installation complexity",
          "your location and travel distance",
          "existing wiring or infrastructure",
          "height or access requirements",
          "additional materials",
          "whether troubleshooting or remedial work is required",
        ],
      },
      {
        type: "note",
        title: "A quotation is required before installation",
        text: "That's why we don't list a fixed installation price. Send us your order number and address and we'll quote on the actual job.",
      },
    ],
  },
  {
    heading: "Site requirements",
    blocks: [
      {
        type: "p",
        text: "Please tell us about relevant site conditions before the appointment. Depending on the product, installation may require:",
      },
      {
        type: "list",
        items: [
          "a functioning electrical supply and suitable wiring",
          "neutral wires",
          "adequate Wi-Fi coverage and internet access",
          "a compatible router configuration",
          "compatible doors, locks or gates",
          "suitable mounting surfaces",
          "access to distribution boards",
          "passwords or account access required for pairing",
          "permission from the owner or body corporate where necessary",
        ],
      },
    ],
  },
  {
    heading: "Wi-Fi and internet performance",
    blocks: [
      {
        type: "p",
        text: "Successful operation of many smart products depends heavily on network quality. Our technicians assist with basic connectivity and pairing, but a standard installation does not include:",
      },
      {
        type: "list",
        items: [
          "redesigning your home network",
          "running network cabling",
          "replacing routers",
          "resolving ISP outages",
          "changing advanced firewall configurations",
          "guaranteeing Wi-Fi coverage throughout the property",
        ],
      },
      {
        type: "p",
        text: "Where network improvements are necessary, we will explain this where reasonably apparent.",
      },
    ],
  },
  {
    heading: "Electrical work",
    blocks: [
      {
        type: "p",
        text: "Products involving mains electricity must be installed in accordance with applicable electrical requirements.",
      },
      {
        type: "p",
        text: "Where specialised electrical work beyond the agreed smart-device installation is necessary, additional work or a suitably qualified electrical contractor may be required.",
      },
      {
        type: "note",
        text: "We reserve the right not to proceed where an installation would be unsafe or unlawful.",
      },
    ],
  },
  {
    heading: "Existing infrastructure",
    blocks: [
      {
        type: "p",
        text: "Our standard installation pricing assumes your existing infrastructure is functional and suitable for the selected product unless otherwise agreed. Additional work might include:",
      },
      {
        type: "list",
        items: [
          "replacing damaged wiring",
          "modifying doors or frames",
          "repairing electrical circuits or installing new electrical points",
          "extensive drilling or chasing",
          "replacing routers or providing Wi-Fi extenders",
          "repairing existing equipment",
        ],
      },
      {
        type: "p",
        text: "Any additional work will be discussed before we proceed, where possible.",
      },
    ],
  },
  {
    heading: "On the day",
    blocks: [
      {
        type: "p",
        text: "An adult authorised to approve the work should be present during installation.",
      },
      {
        type: "p",
        text: "Please confirm the desired location of each device before any permanent drilling, cutting, mounting or modification takes place.",
      },
    ],
  },
  {
    heading: "Account setup and passwords",
    blocks: [
      { type: "p", text: "Technicians may need temporary access to:" },
      {
        type: "list",
        items: [
          "your Wi-Fi network",
          "manufacturer applications",
          "your smart-home ecosystem",
        ],
      },
      {
        type: "note",
        title: "Type your own passwords where you can",
        text: `${SITE.name} personnel should never need to retain your personal passwords after installation. We recommend changing any temporary password given to a technician once the work is complete.`,
      },
    ],
  },
  {
    heading: "Third-party services",
    blocks: [
      {
        type: "p",
        text: "We cannot guarantee the continued availability of third-party apps, cloud platforms, voice assistants, integrations or internet services.",
      },
      {
        type: "p",
        text: "The installation service confirms appropriate setup at the time of installation; it is not a guarantee that a third-party platform will operate indefinitely.",
      },
    ],
  },
  {
    heading: "Workmanship",
    blocks: [
      {
        type: "p",
        text: "If you believe an installation performed by our team is faulty, please contact us promptly. We will assess whether the problem results from:",
      },
      {
        type: "list",
        items: [
          "workmanship",
          "product failure",
          "network conditions",
          "pre-existing infrastructure",
          "third-party services",
          "subsequent alteration or damage",
        ],
      },
      {
        type: "p",
        text: (
          <>
            Where the installation service itself was not performed to the
            required standard, we will provide an appropriate remedy as required
            by law. A hardware fault is handled under the{" "}
            <Link
              href="/warranty"
              className="font-semibold text-brand-700 hover:underline"
            >
              warranty policy
            </Link>{" "}
            instead.
          </>
        ),
      },
    ],
  },
  {
    heading: "Cancellations and rescheduling",
    blocks: [
      {
        type: "p",
        text: "Please give us at least 24 hours' notice if you need to reschedule an installation.",
      },
      {
        type: "p",
        text: "A call-out or cancellation fee may apply where:",
      },
      {
        type: "list",
        items: [
          "the technician has already travelled to the property",
          "no authorised person is available",
          "access cannot be obtained",
          "an incorrect address was supplied",
          "installation cannot proceed because required site information was materially misrepresented",
        ],
      },
      { type: "p", text: "Any such fee will be disclosed to you first." },
    ],
  },
];

export default function InstallationPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Installation Support"
      title="Installation Support"
      intro={`We offer installation support for selected smart-home products in ${CITIES_SENTENCE}. This policy explains what we fit, what a quotation depends on, and what we need from you on site.`}
      sections={SECTIONS}
    >
      <div className="rounded-card border border-brand-200 bg-brand-50 p-6">
        <p className="font-bold text-ink-900">Request installation</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
          Already ordered? Message us with your order number and delivery address
          and we&apos;ll confirm whether you&apos;re in a serviced area and what
          the job would cost.
        </p>
        <a
          href={whatsappLink(
            `Hi ${SITE.name}, I'd like to request installation support. My order number is:`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
        >
          <MessageCircle size={16} />
          Request installation on WhatsApp
        </a>
      </div>

      <div className="mt-6">
        <PolicyContact heading="Installation enquiries" />
      </div>
    </PolicyPage>
  );
}
