import Link from "next/link";
import {
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { LogoLink } from "@/components/layout/logo";
import {
  CITIES_SENTENCE,
  DELIVERY_WINDOW,
  POLICY_PAGES,
  SITE,
  whatsappLink,
} from "@/lib/constants";
import { getCategoryTree } from "@/lib/queries";

const SHOP_LINKS = [
  { label: "All Products", href: "/products" },
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Deals & Offers", href: "/products?onSale=1" },
];

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "FAQs", href: "/faqs" },
  { label: "Installation Support", href: "/installation" },
];

/**
 * Site footer.
 *
 * A Server Component, so unlike the header it reads the category tree itself
 * rather than taking it as a prop. Same cached query either way.
 */
export async function Footer() {
  const categories = await getCategoryTree();

  return (
    <footer className="mt-16 bg-ink-950 text-ink-300">
      {/* Reassurance strip.
          Every claim here now matches the policy that governs it and links to
          it. The previous version promised "free shipping over R1 500",
          "delivery in 2–4 working days", "2-year warranty" and "30-day returns"
          — four numbers, none of which the Shipping, Warranty or Returns policy
          actually commits to. A footer badge that contradicts the policy is the
          kind of mismatch that becomes a CPA complaint. */}
      <div className="border-b border-white/10">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-3">
          <TrustBadge
            href="/shipping"
            icon={<Truck size={20} />}
            title="Nationwide delivery"
            description={`Anywhere in South Africa in ${DELIVERY_WINDOW}`}
          />
          <TrustBadge
            href="/warranty"
            icon={<ShieldCheck size={20} />}
            title="Warranty"
            description="Statutory cover plus manufacturer warranty where applicable"
          />
          <TrustBadge
            href="/returns"
            icon={<RotateCcw size={20} />}
            title="Returns & exchanges"
            description="A clear process for defective, wrong or damaged items"
          />
        </div>
      </div>

      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            {/* The white variant of the vector mark — this footer is near-black,
                so the dark lockup would disappear into it. */}
            <LogoLink variant="light" className="h-12" showTagline />

            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              South Africa&apos;s smart security and automation store. Smart
              locks, alarms, switches and audio — delivered nationwide, with
              installation support in {CITIES_SENTENCE}.
            </p>

            <div className="mt-6 flex gap-3">
              <SocialLink href={whatsappLink()} label="WhatsApp">
                <MessageCircle size={18} />
              </SocialLink>
              <SocialLink href="https://www.facebook.com/share/1BxDDGTqnW/?mibextid=wwXIfr" label="Facebook">
                <Facebook size={18} />
              </SocialLink>
              <SocialLink href="https://www.instagram.com/tadosmartech/?hl=en" label="Instagram">
                <Instagram size={18} />
              </SocialLink>
              <SocialLink href="https://www.linkedin.com/company/tado-smartech" label="LinkedIn">
                <Linkedin size={18} />
              </SocialLink>
            </div>
          </div>

          <FooterColumn
            title="Categories"
            links={categories.map((c) => ({
              label: c.name,
              href: `/category/${c.slug}`,
            }))}
          />
          <FooterColumn title="Shop" links={SHOP_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
        </div>

        <div className="mt-10 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-2">
          {/* POLICY_PAGES rather than a local copy — this list used to duplicate
              it and had already drifted ("Return Policy" vs "Returns & Refunds",
              and Installation Support missing entirely). */}
          <FooterColumn title="Policy & Info" links={[...POLICY_PAGES]} inline />

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
            {/* No street address: we don't publish one, and the old line printed
                an undefined field. Operating areas are the useful fact anyway. */}
            <p className="mt-2 text-ink-400">
              {CITIES_SENTENCE}, South Africa
            </p>
            <p className="text-ink-400">{SITE.operatingHours}</p>
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
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** The policy behind the claim. A shopper who reads a badge and wants the
   *  detail shouldn't have to hunt for it in the link list below. */
  href: string;
}) {
  return (
    <Link href={href} className="group flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-600/15 text-brand-400 transition-colors group-hover:bg-brand-600/25">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white group-hover:text-brand-400">
          {title}
        </p>
        <p className="text-xs text-ink-400">{description}</p>
      </div>
    </Link>
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
