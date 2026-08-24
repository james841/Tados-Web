import type { Metadata } from "next";

import {
  PolicyContact,
  PolicyPage,
  type PolicyBlock,
  type PolicySection,
} from "@/components/policy/policy-page";
import {
  CITIES_SENTENCE,
  DELIVERY_WINDOW,
  SITE,
  whatsappLink,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "FAQs",
  description: `Answers to the questions we're asked most: delivery times, installation areas, smart-home compatibility, load shedding, warranty, returns and privacy.`,
  alternates: { canonical: "/faqs" },
};

/**
 * FAQ content, kept as plain strings rather than JSX.
 *
 * Two consumers read the same source: the rendered page and the FAQPage
 * structured data below. Google will not accept JSX, and maintaining two copies
 * of 28 answers guarantees they drift, so the answers stay as text and both
 * outputs are derived from them.
 */
interface Faq {
  q: string;
  /** Answer paragraphs. */
  a: string[];
  /** Optional bullet list, rendered between the paragraphs and the note. */
  items?: string[];
  /** Optional boxed aside — the "and this is the bit people miss" line. */
  note?: string;
}

interface FaqGroup {
  heading: string;
  faqs: Faq[];
}

const GROUPS: FaqGroup[] = [
  {
    heading: "About us",
    faqs: [
      {
        q: `What does ${SITE.name} sell?`,
        a: [
          "We sell smart-home technology designed to make homes more connected, convenient, secure and easier to control.",
          "Our range may include smart switches, sockets, lighting, cameras, sensors, locks, controllers and other home-automation products.",
        ],
      },
      {
        q: "Do you deliver throughout South Africa?",
        a: [
          `Yes. We offer nationwide delivery across South Africa, and our normal delivery estimate is ${DELIVERY_WINDOW}, depending on your location, courier availability and product availability.`,
        ],
      },
      {
        q: "Can I buy from you if I live outside your installation areas?",
        a: [
          "Absolutely. We deliver nationwide, so customers anywhere in South Africa can purchase from us.",
          "Where we do not have installation support available, we can still provide reasonable product and setup guidance, and you may use your own suitably qualified installer where required.",
        ],
      },
    ],
  },
  {
    heading: "Delivery and tracking",
    faqs: [
      {
        q: "How long does delivery take?",
        a: [
          `Most orders are expected to arrive within ${DELIVERY_WINDOW} after processing.`,
          "Remote locations, courier disruptions and peak periods may occasionally take longer.",
        ],
      },
      {
        q: "How do I track my order?",
        a: [
          "Once your parcel has been dispatched, we will provide tracking information where supported by the courier.",
          "You can also follow an order's status under My Account.",
        ],
      },
    ],
  },
  {
    heading: "Choosing the right product",
    faqs: [
      {
        q: "How do I know whether a smart product will work in my home?",
        a: [
          "Check the compatibility information on the product page carefully. Depending on the product, you may need:",
        ],
        items: [
          "2.4 GHz Wi-Fi",
          "a particular phone operating system",
          "neutral wiring",
          "a compatible smart-home ecosystem",
          "Bluetooth",
          "a hub",
          "particular dimensions",
          "another technical requirement",
        ],
        note: "If you are unsure, contact us before ordering and tell us what you would like to control and what equipment you already have. This is the single most common cause of returns and it is entirely avoidable.",
      },
      {
        q: "Why do so many smart devices use 2.4 GHz Wi-Fi?",
        a: [
          "Many smart-home devices use 2.4 GHz because of its coverage characteristics and widespread support.",
          "Check the specifications of the particular device, as compatibility varies between products.",
        ],
      },
      {
        q: "Will your products work with Google Home, Alexa or Apple Home?",
        a: [
          "Compatibility depends on the individual product. Never assume that every smart device supports every ecosystem.",
          "Where applicable, supported platforms are identified in the product specification.",
        ],
      },
      {
        q: "Do I need internet access for smart-home products?",
        a: [
          "Many products require internet access for initial setup, remote control, notifications or cloud-based functions.",
          "Some functions may continue locally during an internet outage, depending on the particular product.",
        ],
      },
    ],
  },
  {
    heading: "Load shedding and outages",
    faqs: [
      {
        q: "Will smart devices work during load shedding?",
        a: [
          "It depends on the device and your power setup.",
          "Mains-powered devices will ordinarily lose power unless you have suitable backup power. Battery-powered devices may continue operating, although internet-dependent functions can be affected if your router or fibre also loses power.",
        ],
      },
      {
        q: "Do smart cameras record during an internet outage?",
        a: [
          "This depends on the camera. A device with local storage may have different capabilities from one that relies entirely on cloud storage.",
        ],
        note: "If offline recording matters to you, check the specific product description before buying — or ask us and we will confirm it for that model.",
      },
    ],
  },
  {
    heading: "Installation",
    faqs: [
      {
        q: "Where do you provide installation?",
        a: [
          `We currently have installation support available in ${CITIES_SENTENCE}.`,
          "Availability depends on your exact location and technician scheduling.",
        ],
      },
      {
        q: "Is installation included in the product price?",
        a: [
          "No — not unless the product page or quotation specifically says so.",
          "Installation is ordinarily quoted separately because costs depend on the type and number of products, your location, and the complexity of the installation.",
        ],
      },
      {
        q: "Can I book installation when ordering?",
        a: [
          "Where available, you may request installation during or after your purchase.",
          "Our team will confirm whether your address is within our installation area and whether a quotation is required.",
        ],
        note: "After you pay, we ask whether you would like installation and hand the request straight to our team on WhatsApp with your order details attached.",
      },
      {
        q: "Do you charge a call-out fee?",
        a: [
          "Installation and call-out charges depend on location and the work required.",
          "Any applicable charges are communicated to you before the appointment is confirmed.",
        ],
      },
      {
        q: "Can I install products myself?",
        a: [
          "Some smart products are designed for straightforward customer installation.",
          "Others involve mains electricity, locks, drilling or specialised configuration and should be installed by an appropriately qualified person. Always follow the manufacturer's instructions.",
        ],
      },
      {
        q: "Can I use my own electrician or installer?",
        a: [
          "Yes, unless there is a particular product-specific reason requiring otherwise.",
          "We recommend using suitably qualified persons for electrical or specialised installations.",
        ],
      },
    ],
  },
  {
    heading: "Warranty and returns",
    faqs: [
      {
        q: "What warranty do I receive?",
        a: [
          "Your purchase is protected by applicable South African consumer law, and certain products may also carry additional manufacturer warranties.",
          "Specific manufacturer warranty information is provided where applicable, which is why we don't advertise one blanket period across the whole range.",
        ],
      },
      {
        q: "What happens if my product is defective?",
        a: [
          "Contact us with your order number and details of the problem.",
          "We may ask you to perform basic troubleshooting or provide photographs or video before arranging further assessment. Statutory rights relating to defective products remain applicable.",
        ],
      },
      {
        q: "What if I bought the wrong product?",
        a: [
          "Contact us as soon as possible. If the product has not yet shipped, we may be able to change the order.",
          "If it has already been delivered, the applicable return conditions will depend on whether it remains unused and whether statutory or voluntary return rights apply.",
        ],
      },
      {
        q: "What happens if the product does not work with my Wi-Fi or wiring?",
        a: [
          "Contact our support team first — the issue may relate to configuration rather than a faulty product. We can help identify whether the problem concerns:",
        ],
        items: [
          "Wi-Fi",
          "wiring",
          "device configuration",
          "the manufacturer's app",
          "smart-home ecosystem compatibility",
          "the product itself",
        ],
      },
    ],
  },
  {
    heading: "Security, accounts and payment",
    faqs: [
      {
        q: "Are smart-home products secure?",
        a: [
          "Connected devices should be used with good cybersecurity practices. We recommend:",
        ],
        items: [
          "strong, unique passwords",
          "two-factor authentication where available",
          "updated firmware",
          "a secure Wi-Fi network",
          "reputable manufacturer applications",
          "changing default passwords immediately",
        ],
      },
      {
        q: "Can your technician see my passwords?",
        a: [
          "Our technicians should not retain your passwords. Where possible, you should type your own Wi-Fi and account credentials into your phone during setup.",
          "If you provide a temporary password for installation, consider changing it afterwards.",
        ],
      },
      {
        q: "Do I need to create an account to order?",
        a: [
          "Registered accounts make it easier to view orders, manage your information and access customer services.",
          "Personal information associated with an account is managed in accordance with our Privacy Policy.",
        ],
      },
      {
        q: "Is my personal information safe?",
        a: [
          "We take reasonable measures to protect customer information and process it in accordance with POPIA.",
          "Our Privacy Policy explains what information we collect, why we collect it, whom it may be shared with and the rights available to you.",
        ],
      },
      {
        q: "Do you store my bank-card details?",
        a: [
          "No. Payments are processed by a secure third-party payment provider, and we do not receive or store your full card data.",
        ],
      },
      {
        q: "What currency am I charged in?",
        a: [
          "Every order is charged and settled in South African rand.",
          "If your prices are displayed in another currency, that is an indicative conversion shown as a guide — the rand amount is always shown alongside it and again at checkout before you pay.",
        ],
      },
    ],
  },
];

/** Faq → the shell's block model. */
function toBlocks(faqs: Faq[]): PolicyBlock[] {
  return faqs.map((faq) => {
    const blocks: PolicyBlock[] = faq.a.map((text) => ({
      type: "p" as const,
      text,
    }));

    if (faq.items) blocks.push({ type: "list", items: faq.items });
    if (faq.note) blocks.push({ type: "note", text: faq.note });

    return { type: "qa", question: faq.q, blocks };
  });
}

const SECTIONS: PolicySection[] = GROUPS.map((group) => ({
  heading: group.heading,
  blocks: toBlocks(group.faqs),
}));

/**
 * FAQPage structured data.
 *
 * Google renders these as expandable results, which is worth having on a page
 * that answers "how long does delivery take" — a query people type verbatim.
 * Built from the same source as the visible answers so the two can't disagree,
 * which is exactly what the guidelines require.
 */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: GROUPS.flatMap((group) =>
    group.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: [
          ...faq.a,
          ...(faq.items ? [faq.items.join("; ") + "."] : []),
          ...(faq.note ? [faq.note] : []),
        ].join(" "),
      },
    })),
  ),
};

export default function FaqsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PolicyPage
        eyebrow="FAQs"
        title="FAQs"
        intro="The questions we're asked most — about delivery, compatibility, installation, load shedding, warranty and privacy. If yours isn't here, ask us directly."
        sections={SECTIONS}
      >
        <div className="rounded-card border border-ink-200 bg-ink-50 p-6">
          <p className="font-bold text-ink-900">Still not sure?</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
            Tell us what you want to control and what equipment you already have,
            and we&apos;ll tell you whether a product will work in your home
            before you buy it.
          </p>
          <a
            href={whatsappLink(
              `Hi ${SITE.name}, I have a question about a product:`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            Ask us on WhatsApp
          </a>
        </div>

        <div className="mt-6">
          <PolicyContact heading="Other ways to reach us" />
        </div>
      </PolicyPage>
    </>
  );
}
