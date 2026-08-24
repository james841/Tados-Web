import type { Metadata } from "next";
import Link from "next/link";

import {
  PolicyContact,
  PolicyPage,
  type PolicySection,
} from "@/components/policy/policy-page";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} collects, uses, shares and protects your personal information under the Protection of Personal Information Act (POPIA), and the rights available to you.`,
  alternates: { canonical: "/privacy" },
};

/**
 * The source document listed the categories of collected information as eight
 * nested sub-lists. Flattened into one list with bold lead-ins here — a nested
 * bullet list four levels deep is technically faithful and practically unreadable.
 */
function Category({ label, children }: { label: string; children: string }) {
  return (
    <>
      <strong className="font-semibold text-ink-900">{label}</strong> —{" "}
      {children}
    </>
  );
}

const SECTIONS: PolicySection[] = [
  {
    heading: "Information we may collect",
    blocks: [
      {
        type: "p",
        text: "Depending on how you use our services, we may collect:",
      },
      {
        type: "list",
        items: [
          <Category key="identity" label="Identity information">
            first name, surname, username, and business name where applicable.
          </Category>,
          <Category key="contact" label="Contact information">
            email address, telephone or mobile number, billing address and
            delivery address.
          </Category>,
          <Category key="account" label="Account information">
            username, hashed password, account preferences and account history.
          </Category>,
          <Category key="transaction" label="Transaction information">
            products purchased, order values, transaction references, refund
            information and payment status.
          </Category>,
          <Category key="payment" label="Payment-related information">
            transaction confirmation and limited payment data received from our
            payment processor.
          </Category>,
          <Category key="technical" label="Technical information">
            IP address, browser and device type, operating system, website
            activity, cookies, login information and security logs.
          </Category>,
          <Category key="support" label="Customer-service information">
            emails, WhatsApp or other support messages, warranty queries,
            photographs or video submitted for troubleshooting, and installation
            requests.
          </Category>,
          <Category key="install" label="Installation information">
            property or service address, device details, installation
            requirements, appointment information, and technical details
            reasonably needed to complete the service.
          </Category>,
        ],
      },
      {
        type: "note",
        title: "We do not receive your full card details",
        text: "Payments are handled by a third-party payment processor. Depending on the payment solution used, we may receive transaction confirmation and limited payment-related data without receiving or storing your complete card number.",
      },
    ],
  },
  {
    heading: "Why we process personal information",
    blocks: [
      { type: "p", text: "We may process personal information to:" },
      {
        type: "list",
        items: [
          "create and administer your account",
          "process your order and take payment",
          "arrange delivery and communicate order updates",
          "provide customer service and respond to complaints",
          "administer warranties and returns",
          "arrange installation",
          "prevent fraud and protect our website and systems",
          "comply with legal and accounting obligations",
          "improve our products and services",
          "maintain business records",
          "conduct marketing where lawfully permitted",
        ],
      },
    ],
  },
  {
    heading: "Website registration",
    blocks: [
      {
        type: "p",
        text: `When you create a ${SITE.name} account, we process the information necessary to establish and maintain that account.`,
      },
      {
        type: "p",
        text: "You are responsible for protecting your password. Passwords are stored using appropriate security measures, never in plain readable form.",
      },
    ],
  },
  {
    heading: "Guest checkout",
    blocks: [
      {
        type: "p",
        text: "Where our website permits guest checkout, you do not need to create a permanent customer profile solely to purchase a product — although we will still need certain information to fulfil your order and meet legal requirements.",
      },
    ],
  },
  {
    heading: "Marketing communications",
    blocks: [
      {
        type: "p",
        text: "We may send marketing communications where permitted. Where consent is required, we will request it appropriately.",
      },
      {
        type: "p",
        text: "You may unsubscribe using the mechanism provided in the message, or by contacting us.",
      },
      {
        type: "note",
        text: "Unsubscribing from marketing does not stop operational messages necessary to administer an existing order, warranty claim or account.",
      },
    ],
  },
  {
    heading: "Cookies",
    blocks: [
      {
        type: "p",
        text: "Our website may use cookies and related technologies for:",
      },
      {
        type: "list",
        items: [
          "essential website functionality",
          "account sessions",
          "shopping-cart operation",
          "security",
          "analytics",
          "preferences, including the currency your prices are displayed in",
          "marketing, where applicable",
        ],
      },
      {
        type: "p",
        text: "Where required, you will be given appropriate cookie choices.",
      },
    ],
  },
  {
    heading: "Sharing personal information",
    blocks: [
      {
        type: "p",
        text: "We may share necessary personal information with trusted service providers, including:",
      },
      {
        type: "list",
        items: [
          "courier companies",
          "payment processors",
          "website-hosting and cloud-service providers",
          "IT and security providers",
          "installation technicians",
          "customer-support platforms",
          "accountants, auditors and professional advisers",
        ],
      },
      {
        type: "p",
        text: "We aim to disclose only the information reasonably required for the service concerned.",
      },
    ],
  },
  {
    heading: "Couriers",
    blocks: [
      {
        type: "p",
        text: "For delivery purposes we may provide a courier with your name, mobile number, delivery address and delivery instructions. The courier needs this information to complete the requested delivery.",
      },
    ],
  },
  {
    heading: "Installation technicians",
    blocks: [
      {
        type: "p",
        text: "Where installation is requested, relevant contact, address and technical information may be shared with the technician assigned to the job.",
      },
      {
        type: "p",
        text: "Technicians receive only the information reasonably necessary to perform the requested service.",
      },
    ],
  },
  {
    heading: "Information security",
    blocks: [
      {
        type: "p",
        text: "We take reasonable technical and organisational measures to protect personal information against unauthorised access, loss, misuse, alteration, destruction and unlawful disclosure.",
      },
      {
        type: "p",
        text: "Measures include access controls, authentication, encryption where appropriate, secure hosting, backups, software updates, and staff and contractor controls.",
      },
    ],
  },
  {
    heading: "Security incidents",
    blocks: [
      {
        type: "p",
        text: "Where there are reasonable grounds to believe personal information has been accessed or acquired by an unauthorised person, POPIA imposes notification requirements concerning the Information Regulator and affected data subjects, subject to the statutory conditions.",
      },
      {
        type: "p",
        text: `${SITE.name} will respond to qualifying security incidents in accordance with applicable legal requirements.`,
      },
    ],
  },
  {
    heading: "Retention",
    blocks: [
      {
        type: "p",
        text: "We will not retain personal information for longer than reasonably necessary for the purpose for which it was processed, unless:",
      },
      {
        type: "list",
        items: [
          "retention is required or permitted by law",
          "it is reasonably required for legitimate business purposes",
          "a contract requires retention",
          "another lawful basis applies",
        ],
      },
    ],
  },
  {
    heading: "Your rights",
    blocks: [
      {
        type: "p",
        text: "Subject to applicable law and appropriate identity verification, you may have the right to:",
      },
      {
        type: "list",
        items: [
          "ask whether we hold personal information about you",
          "request access to certain information",
          "request correction of inaccurate information",
          "request deletion where legally appropriate",
          "object to certain processing",
          "withdraw consent where processing depends on consent",
          "complain to the Information Regulator",
        ],
      },
      {
        type: "p",
        text: (
          <>
            To exercise any of these rights, email{" "}
            <a
              href={`mailto:${SITE.privacyEmail}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {SITE.privacyEmail}
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "Account deletion",
    blocks: [
      {
        type: "p",
        text: (
          <>
            To close your website account, contact{" "}
            <a
              href={`mailto:${SITE.privacyEmail}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {SITE.privacyEmail}
            </a>
            .
          </>
        ),
      },
      {
        type: "p",
        text: "Closing your account does not necessarily require us to immediately delete every transaction record. Certain information may need to be retained for tax, accounting, fraud prevention, warranty, dispute-resolution or other lawful purposes.",
      },
    ],
  },
  {
    heading: "Children's information",
    blocks: [
      {
        type: "p",
        text: "Our website and products are primarily intended for adult purchasers. We do not knowingly seek to create customer accounts for children where the processing would not be lawful.",
      },
    ],
  },
  {
    heading: "Third-party links and smart-device apps",
    blocks: [
      {
        type: "p",
        text: `Products sold by ${SITE.name} may require applications or online accounts operated by manufacturers or other third parties. Those organisations process information under their own privacy policies.`,
      },
      {
        type: "note",
        title: "Read the app's privacy terms before you connect a device",
        text: `${SITE.name} does not control a manufacturer's independent privacy practices merely because we sell a compatible device. Cameras, doorbells and locks in particular may send footage or access logs to a platform we have no control over.`,
      },
    ],
  },
  {
    heading: "Changes to this policy",
    blocks: [
      {
        type: "p",
        text: "We may revise this Privacy Policy to reflect changes in our business, website functions, service providers, technologies or legal requirements.",
      },
      {
        type: "p",
        text: (
          <>
            The terms that apply to your use of the website generally are set out
            in our{" "}
            <Link
              href="/terms"
              className="font-semibold text-brand-700 hover:underline"
            >
              Terms &amp; Conditions
            </Link>
            .
          </>
        ),
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy Policy"
      title="Privacy Policy"
      intro={`${SITE.name} respects your privacy and is committed to processing personal information responsibly and in accordance with the Protection of Personal Information Act 4 of 2013 ("POPIA").`}
      sections={SECTIONS}
    >
      <PolicyContact
        heading="Privacy queries and requests"
        email={SITE.privacyEmail}
      />
    </PolicyPage>
  );
}
