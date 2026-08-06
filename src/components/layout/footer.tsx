import Link from "next/link";
import { Facebook, Instagram, Linkedin, Truck, ShieldCheck, RotateCcw } from "lucide-react";

import { CATEGORY_TREE, SITE } from "@/lib/constants";

const SHOP_LINKS = [
  { label: "All Products", href: "/products" },
  { label: "Bestsellers", href: "/bestsellers" },
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Deals & Offers", href: "/products?onSale=1" },
];

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "FAQs", href: "/faqs" },
  { label: "Installation Support", href: "/support" },
];

const POLICY_LINKS = [
  { label: "Shipping Policy", href: "/shipping" },
  { label: "Return Policy", href: "/returns" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Warranty", href: "/warranty" },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-ink-950 text-ink-300">
      {/* Trust badges strip */}
      <div className="border-b border-white/10">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-3">
          <TrustBadge
            icon={<Truck size={20} />}
            title="Free shipping over R1 500"
            description="Nationwide delivery in 2–4 working days"
          />
          <TrustBadge
            icon={<ShieldCheck size={20} />}
            title="2-year warranty"
            description="Manufacturer-backed on every device"
          />
          <TrustBadge
            icon={<RotateCcw size={20} />}
            title="30-day returns"
            description="Free and easy return policy"
          />
        </div>
      </div>

      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-lg font-bold text-white">T</span>
              </div>
              <span className="text-xl font-bold text-white">Tados Web</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              South Africa&apos;s smart security and automation store. Smart
              locks, alarms, switches and audio — installed, supported and
              backed by warranty.
            </p>

            <div className="mt-6 flex gap-3">
              <SocialLink href="https://facebook.com" label="Facebook">
                <Facebook size={18} />
              </SocialLink>
              <SocialLink href="https://instagram.com" label="Instagram">
                <Instagram size={18} />
              </SocialLink>
              <SocialLink href="https://linkedin.com" label="LinkedIn">
                <Linkedin size={18} />
              </SocialLink>
            </div>
          </div>

          <FooterColumn
            title="Categories"
            links={CATEGORY_TREE.map((c) => ({
              label: c.name,
              href: `/category/${c.slug}`,
            }))}
          />
          <FooterColumn title="Shop" links={SHOP_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
        </div>

        <div className="mt-10 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-2">
          <FooterColumn title="Policy & Info" links={POLICY_LINKS} inline />

          <div className="text-sm sm:text-right">
            <p className="font-semibold text-white">Get in touch</p>
            <p className="mt-2">
              <a
                href={`mailto:${SITE.email}`}
                className="transition-colors hover:text-brand-400"
              >
                {SITE.email}
              </a>
            </p>
            <p>
              <a
                href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                className="transition-colors hover:text-brand-400"
              >
                {SITE.phone}
              </a>
            </p>
            <p className="mt-2 text-ink-400">
              {SITE.address.street}, {SITE.address.city},{" "}
              {SITE.address.province}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-6 text-xs text-ink-400">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-2">
            Secure payments by
            <span className="rounded bg-white px-2 py-1 font-bold text-ink-900">
              PayFast
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function TrustBadge({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-600/15 text-brand-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-ink-400">{description}</p>
      </div>
    </div>
  );
}

function FooterColumn({
  title,
  links,
  inline = false,
}: {
  title: string;
  links: { label: string; href: string }[];
  inline?: boolean;
}) {
  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-white">{title}</p>
      <ul className={inline ? "flex flex-wrap gap-x-5 gap-y-2" : "space-y-2.5"}>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm transition-colors hover:text-brand-400"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-brand-600"
    >
      {children}
    </a>
  );
}
