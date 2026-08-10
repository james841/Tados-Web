import type { Metadata } from "next";
import { Headphones, ShieldCheck, Truck, Wrench } from "lucide-react";

import { ButtonLink } from "@/components/ui";
import { SITE, TRUST_BADGES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About Us",
  description: `${SITE.name} supplies and supports smart security and home automation hardware across South Africa — smart locks, alarm systems, Zigbee switches and ceiling audio.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About | ${SITE.name}`,
    description:
      "Who we are, what we stock, and how we support it across South Africa.",
    url: `${SITE.url}/about`,
  },
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Hardware we'd fit at home",
    body: "Every product is chosen on build quality and failure modes first. A lock that opens for the wrong person is worse than no lock at all, so anti-spoof performance and mechanical key backup are non-negotiable on our shelves.",
  },
  {
    icon: Wrench,
    title: "Installed once, properly",
    body: "Most of our range is DIY-friendly, and the rest is standard fitment for any locksmith or electrician. We publish the door thickness, backset and voltage requirements up front so nothing arrives that can't be fitted.",
  },
  {
    icon: Truck,
    title: "Stocked locally",
    body: "We hold inventory in South Africa rather than drop-shipping. That's why delivery is measured in days, and why a warranty claim doesn't turn into a three-month wait for a replacement part.",
  },
  {
    icon: Headphones,
    title: "Support that answers",
    body: "Setup questions, app pairing, a sensor that won't calibrate — reach a real person who knows the product. Our support line is the same team that tests the stock.",
  },
];

export default function AboutPage() {
  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          About us
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Smart security, made practical
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">
          {SITE.name} supplies smart locks, alarm systems and home automation
          hardware to homes, estates and small businesses across South Africa.
          We stock a deliberately narrow range — the devices we&apos;ve tested,
          can support, and can get parts for.
        </p>
      </header>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-ink-900">What we believe</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-card border border-ink-200 bg-white p-6"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <value.icon size={20} />
              </span>
              <h3 className="mt-4 font-bold text-ink-900">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {value.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-card border border-ink-200 bg-ink-50 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-ink-900">
          What every order includes
        </h2>
        <ul className="mt-5 grid gap-5 sm:grid-cols-3">
          {TRUST_BADGES.map((badge) => (
            <li key={badge.title}>
              <p className="font-semibold text-ink-900">{badge.title}</p>
              <p className="mt-1 text-sm text-ink-600">{badge.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-ink-900">Where to find us</h2>
        <address className="mt-4 not-italic text-sm leading-relaxed text-ink-600">
          {SITE.address.street}
          <br />
          {SITE.address.city}, {SITE.address.province}{" "}
          {SITE.address.postalCode}
          <br />
          <a
            href={`mailto:${SITE.email}`}
            className="font-semibold text-brand-700 hover:underline"
          >
            {SITE.email}
          </a>
          <br />
          <a
            href={`tel:${SITE.phone.replace(/\s/g, "")}`}
            className="font-semibold text-brand-700 hover:underline"
          >
            {SITE.phone}
          </a>
        </address>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/products" variant="primary">
            Browse the range
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline">
            Get in touch
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
