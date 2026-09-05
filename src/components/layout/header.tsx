"use client";

import Link from "next/link";
import { MessageCircle, ShoppingBag, Menu, Phone, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { CurrencySwitcher } from "@/components/currency/currency-switcher";
import { AccountMenu } from "@/components/layout/account-menu";
import { LogoLink } from "@/components/layout/logo";
import { SearchCommand } from "@/components/layout/search-command";
import { DELIVERY_PROMISE, SITE, whatsappLink } from "@/lib/constants";
import type { CategoryNode } from "@/lib/queries";
import { useCart, selectCartCount } from "@/store/cart";
import { cn } from "@/lib/utils";

/**
 * Site header.
 *
 * Built around the black wordmark rather than the other way round. The mark is a
 * solid near-black lockup, so it needs two things to read as deliberate: a
 * matching block of black above it, and enough clear space around it that it
 * isn't crowded by navigation. Hence the flat ink-950 utility strip and the
 * 72px main row — the mark sits in a composition instead of floating in white.
 *
 * No gradients anywhere, per the brief. Depth comes from a hairline rule and a
 * shadow that only appears once the page scrolls.
 *
 * `categories` comes down from the root layout rather than being fetched here:
 * this is a client component (cart state, mobile menu, session), so it can't
 * query the database itself. It defaults to an empty array so a failed query
 * costs the dropdown, not the whole header.
 */
export function Header({ categories = [] }: { categories?: CategoryNode[] }) {
  const pathname = usePathname();
  const cartCount = useCart(selectCartCount);
  const openCart = useCart((s) => s.openCart);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Utility strip. Flat ink-950 — the visual anchor the black mark hangs
          from. Delivery promise on the left because it's the single most useful
          thing a first-time visitor can know. */}
      <div className="bg-ink-950 text-white">
        <div className="container-page">
          <div className="flex h-9 items-center justify-between gap-4 text-[12px]">
            <p className="truncate font-medium tracking-wide text-white/80">
              {DELIVERY_PROMISE}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={whatsappLink(
                  `Hi ${SITE.name}, I'd like help choosing a product.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded px-2 py-1 font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <MessageCircle size={13} />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
              <a
                href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                className="hidden items-center gap-1.5 rounded px-2 py-1 font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:flex"
              >
                <Phone size={13} />
                {SITE.phone}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-3 sm:h-18 sm:gap-6">
          {/* The mark. Wordmark alone on mobile where width is scarce; the full
              lockup with "SMART TECHNOLOGY" from sm up, which is where the
              brand line earns its space. */}
          <LogoLink className="h-7 sm:hidden" />
          <LogoLink className="hidden h-10 sm:block" showTagline />

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            <NavLink href="/" active={pathname === "/"}>
              Home
            </NavLink>
            <CategoryDropdown categories={categories} />
            <NavLink href="/products" active={pathname === "/products"}>
              Shop All
            </NavLink>
            <NavLink href="/new-arrivals" active={pathname === "/new-arrivals"}>
              New Arrivals
            </NavLink>
          </nav>

          {/* Right icons */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <CurrencySwitcher className="hidden sm:block" />

            <SearchCommand />

            <AccountMenu />

         
            <button
              type="button"
              onClick={openCart}
              className="relative flex size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
              aria-label={`Cart, ${cartCount} items`}
              aria-haspopup="dialog"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 ? (
                <span className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:hidden"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen ? (
          <nav className="flex flex-col gap-1 border-t border-ink-200 py-4 lg:hidden">
            <MobileLink href="/" onClick={() => setMobileOpen(false)}>
              Home
            </MobileLink>
            <MobileLink href="/products" onClick={() => setMobileOpen(false)}>
              All Products
            </MobileLink>
            {categories.map((parent) => (
              <details key={parent.slug} className="group">
                <summary className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900">
                  {parent.name}
                  <span className="text-xs text-ink-400 transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="ml-4 mt-1 flex flex-col gap-1">
                  {parent.children.map((child) => (
                    <MobileLink
                      key={child.slug}
                      href={`/category/${child.slug}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.name}
                    </MobileLink>
                  ))}
                </div>
              </details>
            ))}
            <MobileAccountLinks onNavigate={() => setMobileOpen(false)} />

            {/* The switcher is hidden from the icon row on small screens, so it
                needs a home here or a phone visitor can't change currency. */}
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink-200 px-4 pt-3">
              <span className="text-sm font-medium text-ink-500">
                Show prices in
              </span>
              <CurrencySwitcher />
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "text-ink-950"
          : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
      )}
    >
      {children}
      {/* An underline rather than a filled pill: the nav sits close to a solid
          black mark, and two competing blocks of tone fight each other. */}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-ink-950"
        />
      ) : null}
    </Link>
  );
}

function CategoryDropdown({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState(false);

  // Nothing to drop down to — don't offer a button that opens an empty panel.
  if (categories.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
      >
        Categories ▾
      </button>

      {open ? (
        <div className="absolute left-1/2 top-full w-[720px] -translate-x-1/2 pt-2">
          <div className="rounded-card border border-ink-200 bg-white p-6 shadow-lift">
            <div className="grid grid-cols-2 gap-6">
              {categories.map((parent) => (
                <div key={parent.slug}>
                  <Link
                    href={`/category/${parent.slug}`}
                    className="mb-3 block text-sm font-bold text-ink-900 hover:text-brand-700"
                  >
                    {parent.name}
                  </Link>
                  <ul className="space-y-2">
                    {parent.children.map((child) => (
                      <li key={child.slug}>
                        <Link
                          href={`/category/${child.slug}`}
                          className="block text-sm text-ink-600 transition-colors hover:text-brand-700"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Mobile-menu account block.
 *
 * Signed in, an avatar-less row with the user's name plus account / orders /
 * admin links — the small-screen counterpart of the header AccountMenu. Signed
 * out, the plain sign-in link.
 */
function MobileAccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const { data: session, status } = useSession();

  // Same flash-avoidance as the desktop menu: don't render the signed-out link
  // while the session is still loading.
  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <MobileLink href="/login" onClick={onNavigate}>
        Sign in
      </MobileLink>
    );
  }

  const { user } = session;
  const links = [
    { href: "/account", label: "My account" },
    { href: "/account#orders", label: "My orders" },
    ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin dashboard" }] : []),
  ];

  return (
    <>
      {links.map((link) => (
        <MobileLink key={link.href} href={link.href} onClick={onNavigate}>
          {link.label}
        </MobileLink>
      ))}
      <div className="border-t border-ink-200 px-4 pb-1 pt-3">
        <p className="text-sm font-semibold text-ink-900">
          {user.name ?? "Signed in"}
        </p>
        <p className="truncate text-xs text-ink-500">{user.email}</p>
        <button
          type="button"
          onClick={() => {
            onNavigate();
            void signOut({ callbackUrl: "/" });
          }}
          className="mt-2 rounded-lg px-0 py-1 text-sm font-medium text-red-600 hover:underline"
        >
          Sign out
        </button>
      </div>
    </>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
    >
      {children}
    </Link>
  );
}
