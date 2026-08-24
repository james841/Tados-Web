import {
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import {
  CITIES_SENTENCE,
  DELIVERY_PROMISE,
  FREE_SHIPPING_THRESHOLD,
  SITE,
  STANDARD_SHIPPING_FEE,
  VAT_RATE,
} from "@/lib/constants";

export const metadata = {
  title: `Settings · Admin · ${SITE.shortName}`,
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Store details, contact info and configuration. Editable values are
          configured in the codebase and deployed.
        </p>
      </header>

      <section className="rounded-card border border-ink-200 bg-white">
        <div className="border-b border-ink-200 px-6 py-4">
          <h2 className="font-bold text-ink-900">Store details</h2>
        </div>

        <dl className="divide-y divide-ink-100 text-sm">
          <Row label="Store name" value={SITE.name} />
          <Row label="Base URL" value={SITE.url} />
          <Row label="Description" value={SITE.description} mono />
        </dl>
      </section>

      <section className="rounded-card border border-ink-200 bg-white">
        <div className="border-b border-ink-200 px-6 py-4">
          <h2 className="font-bold text-ink-900">Contact information</h2>
        </div>

        <dl className="divide-y divide-ink-100 text-sm">
          <Row label="Support email" value={SITE.email} icon={<Mail size={15} />} />
          <Row label="Phone" value={SITE.phone} icon={<Phone size={15} />} />
          <Row
            label="WhatsApp"
            value={`+${SITE.whatsapp}`}
            icon={<MessageCircle size={15} />}
            note="Installation requests are sent here. Set NEXT_PUBLIC_WHATSAPP_NUMBER to change it."
          />
          <Row
            label="Operating areas"
            value={`${CITIES_SENTENCE}, South Africa`}
            icon={<MapPin size={15} />}
            note="Delivery is nationwide; installation is city-based"
          />
        </dl>
      </section>

      <section className="rounded-card border border-ink-200 bg-white">
        <div className="border-b border-ink-200 px-6 py-4">
          <h2 className="font-bold text-ink-900">Commerce</h2>
        </div>

        <dl className="divide-y divide-ink-100 text-sm">
          <Row
            label="Standard shipping"
            value={`R${STANDARD_SHIPPING_FEE}`}
            note={DELIVERY_PROMISE}
          />
          <Row
            label="Shipping waived above"
            value={`R${FREE_SHIPPING_THRESHOLD.toLocaleString("en-ZA")}`}
            note="Internal pricing rule only — not advertised to customers"
          />
          <Row
            label="VAT"
            value={`${VAT_RATE * 100}%`}
            note="Included in all displayed prices"
          />
          <Row
            label="Settlement currency"
            value="ZAR (South African Rand)"
            note="Visitors abroad see a converted guide price; every order is charged in rand"
          />
        </dl>
      </section>

      <p className="flex items-center gap-1.5 px-1 text-xs text-ink-400">
        <ExternalLink size={13} />
        Environment, gateway and storage credentials live in the deployment&apos;s
        environment variables — never in this panel.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
  note,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  note?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <dt className="flex items-center gap-2 font-medium text-ink-500">
        {icon}
        {label}
      </dt>
      <dd
        className={`min-w-0 text-right text-ink-900 ${mono ? "font-mono text-xs leading-relaxed" : "font-semibold"}`}
      >
        {value}
        {note ? (
          <span className="mt-0.5 block text-xs font-normal text-ink-400">
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
