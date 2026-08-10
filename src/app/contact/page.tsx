import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Reach ${SITE.name} about orders, deliveries, support or trade enquiries. ${SITE.phone} · ${SITE.email}`,
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    icon: Phone,
    title: "Call us",
    lines: [SITE.phone],
    href: `tel:${SITE.phone.replace(/\s/g, "")}`,
    note: "Mon–Fri, 08:00–17:00 SAST",
  },
  {
    icon: Mail,
    title: "Email",
    lines: [SITE.email, "Trade: trade@tadosweb.co.za"],
    href: `mailto:${SITE.email}`,
    note: "Replies within one working day",
  },
  {
    icon: MapPin,
    title: "Visit",
    lines: [
      SITE.address.street,
      `${SITE.address.city}, ${SITE.address.province} ${SITE.address.postalCode}`,
    ],
    note: "Collection by appointment",
  },
  {
    icon: Clock,
    title: "Order status",
    lines: [
      "Paid orders dispatch within 1–2 working days",
      "Nationwide delivery in 2–4 working days",
    ],
    note: "Track your order in My Account",
  },
];

export default function ContactPage() {
  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Contact
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Talk to a real person
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">
          Whether it&apos;s a fitting question, an order query or a warranty
          issue, the team that tests the stock is the team that answers.
        </p>
      </header>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {CHANNELS.map((channel) => (
          <div
            key={channel.title}
            className="rounded-card border border-ink-200 bg-white p-6"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <channel.icon size={20} />
            </span>
            <h2 className="mt-4 font-bold text-ink-900">{channel.title}</h2>
            <ul className="mt-2 space-y-0.5 text-sm text-ink-700">
              {channel.lines.map((line, index) =>
                channel.href && index === 0 ? (
                  <li key={line}>
                    <a
                      href={channel.href}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {line}
                    </a>
                  </li>
                ) : (
                  <li key={line}>{line}</li>
                ),
              )}
            </ul>
            <p className="mt-3 text-xs text-ink-500">{channel.note}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 rounded-card border border-ink-200 bg-ink-50 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-ink-900">
          Before you reach out
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-600">
          <li>
            <strong className="font-semibold text-ink-900">
              Tracking your order:
            </strong>{" "}
            sign in to My Account and open the order — status updates there in
            real time.
          </li>
          <li>
            <strong className="font-semibold text-ink-900">
              A payment that hasn&apos;t confirmed:
            </strong>{" "}
            it can take PayFast a few minutes to settle. Refresh the confirmation
            page before writing in.
          </li>
          <li>
            <strong className="font-semibold text-ink-900">
              Warranty:
            </strong>{" "}
            every device carries a 2-year manufacturer-backed warranty. Keep
            your order number handy.
          </li>
        </ul>
      </section>
    </div>
  );
}
