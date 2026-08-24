import type { Metadata } from "next";
import Link from "next/link";

import {
  PolicyContact,
  PolicyPage,
  type PolicySection,
} from "@/components/policy/policy-page";
import { DELIVERY_WINDOW, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: `How ${SITE.name} delivers across South Africa: nationwide courier delivery in ${DELIVERY_WINDOW}, tracking, damaged parcels and failed deliveries.`,
  alternates: { canonical: "/shipping" },
};

const SECTIONS: PolicySection[] = [
  {
    heading: "Delivery areas",
    blocks: [
      {
        type: "p",
        text: "We offer nationwide delivery to physical addresses within South Africa.",
      },
      {
        type: "p",
        text: "Delivery to certain remote, rural, farm, mine, estate or restricted-access locations may require additional time or courier arrangements. Where our courier is unable to provide door-to-door delivery, we may contact you to arrange the nearest available collection or delivery point.",
      },
      {
        type: "note",
        text: "We currently do not guarantee delivery to P.O. boxes. Please supply a physical street address at checkout.",
      },
    ],
  },
  {
    heading: "Estimated delivery time",
    blocks: [
      {
        type: "p",
        text: (
          <>
            Our standard delivery timeframe is{" "}
            <strong className="font-semibold text-ink-900">
              3–7 business days
            </strong>{" "}
            from confirmation and processing of your order. Business days exclude
            Saturdays, Sundays and South African public holidays.
          </>
        ),
      },
      { type: "p", text: "Delivery estimates may vary depending on:" },
      {
        type: "list",
        items: [
          "your delivery location",
          "product availability",
          "courier capacity",
          "public holidays or peak shopping periods",
          "severe weather, road closures or other transport disruptions",
          "remote-area delivery requirements",
          "circumstances beyond our reasonable control",
        ],
      },
      {
        type: "note",
        title: "An estimate is not a fixed date",
        text: "A delivery estimate is not a guarantee of an exact delivery date unless we expressly agree otherwise with you.",
      },
    ],
  },
  {
    heading: "Order processing",
    blocks: [
      {
        type: "p",
        text: "Orders are ordinarily processed after successful payment confirmation.",
      },
      {
        type: "p",
        text: "Orders placed after our daily processing cut-off, over weekends or on public holidays may only begin processing on the next business day.",
      },
      {
        type: "p",
        text: "If an ordered item unexpectedly becomes unavailable or significantly delayed, we will contact you using the details supplied with your order and provide the available options.",
      },
    ],
  },
  {
    heading: "Delivery charges",
    blocks: [
      {
        type: "p",
        text: "Applicable delivery charges are displayed at checkout before payment is completed.",
      },
      {
        type: "p",
        text: "Any free-delivery promotion is subject to the terms stated with that promotion, including any minimum purchase amount or geographical limitation.",
      },
    ],
  },
  {
    heading: "Tracking your order",
    blocks: [
      {
        type: "p",
        text: (
          <>
            Where tracking is available, tracking information is sent to the
            email address or mobile number supplied when placing the order. You
            can also follow an order&apos;s status in{" "}
            <Link
              href="/account"
              className="font-semibold text-brand-700 hover:underline"
            >
              My Account
            </Link>
            .
          </>
        ),
      },
      {
        type: "p",
        text: "Please allow reasonable time after dispatch for courier tracking systems to update.",
      },
    ],
  },
  {
    heading: "Accurate delivery information",
    blocks: [
      {
        type: "p",
        text: "Customers are responsible for providing complete and accurate delivery details:",
      },
      {
        type: "list",
        items: [
          "recipient name",
          "mobile number",
          "physical address",
          "suburb, city and province",
          "postal code",
          "access instructions where applicable",
        ],
      },
      {
        type: "p",
        text: `${SITE.name} will not be responsible for delays caused by incorrect or incomplete information provided by the customer.`,
      },
      {
        type: "p",
        text: "Additional courier charges resulting from an incorrect address, an unsuccessful delivery caused by circumstances within the customer's control, or a requested change of delivery address after dispatch may be charged to the customer.",
      },
    ],
  },
  {
    heading: "Receiving your parcel",
    blocks: [
      {
        type: "p",
        text: "Please inspect the parcel as soon as reasonably possible after delivery. If the outer packaging appears materially damaged, crushed, opened or tampered with, we recommend that you:",
      },
      {
        type: "ordered",
        items: [
          "photograph the package before opening it",
          "retain the packaging",
          "check the product and all accessories",
          "contact us promptly if anything is damaged or missing",
        ],
      },
      {
        type: "note",
        title: "Report transit damage within 48 hours where you can",
        text: "This notification period helps us investigate courier claims efficiently. It does not remove any rights you may have under South African law.",
      },
    ],
  },
  {
    heading: "Missing or incorrect items",
    blocks: [
      {
        type: "p",
        text: "If your order arrives with an incorrect item, a missing component or a quantity discrepancy, please contact us promptly with:",
      },
      {
        type: "list",
        items: [
          "your order number",
          "photographs of the parcel and its contents where applicable",
          "a description of the issue",
        ],
      },
      {
        type: "p",
        text: "We will investigate and arrange an appropriate remedy.",
      },
    ],
  },
  {
    heading: "Failed delivery",
    blocks: [
      {
        type: "p",
        text: "Our courier may make more than one delivery attempt, depending on the courier's procedures.",
      },
      {
        type: "p",
        text: "If a parcel is returned to us because delivery could not be completed for reasons attributable to the customer, we may require payment of a new delivery fee before resending it, except where prohibited by law.",
      },
    ],
  },
  {
    heading: "Delayed or lost parcels",
    blocks: [
      {
        type: "p",
        text: "If tracking indicates an unusual delay, or you believe your parcel has been lost, please contact us and we will raise an investigation with the courier.",
      },
      {
        type: "p",
        text: `Where the courier confirms that a parcel has been lost before lawful delivery to you, ${SITE.name} will arrange an appropriate replacement or refund in accordance with applicable law.`,
      },
    ],
  },
];

export default function ShippingPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Shipping Policy"
      title="Shipping Policy"
      intro={`We aim to get your smart-home products to you securely and as quickly as reasonably possible. We deliver throughout South Africa in ${DELIVERY_WINDOW}.`}
      sections={SECTIONS}
    >
      <PolicyContact heading="Delivery enquiries" />
    </PolicyPage>
  );
}
