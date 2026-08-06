"use client";

import Link from "next/link";
import { Search, ShoppingBag, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { CATEGORY_TREE } from "@/lib/constants";
import { useCart, selectCartCount } from "@/store/cart";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const cartCount = useCart(selectCartCount);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-lg font-bold text-white">T</span>
            </div>
            <span className="hidden text-xl font-bold text-ink-900 sm:inline">
              Tados
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink href="/" active={pathname === "/"}>
              Home
            </NavLink>
            <CategoryDropdown />
            <NavLink href="/bestsellers" active={pathname === "/bestsellers"}>
              Bestsellers
            </NavLink>
            <NavLink href="/new-arrivals" active={pathname === "/new-arrivals"}>
              New Arrivals
            </NavLink>
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="flex size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
              aria-label="Search"
            >
              <Search size={20} />
            </Link>

            <Link
              href="/account"
              className="hidden size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 sm:flex"
              aria-label="Account"
            >
              <User size={20} />
            </Link>

            <Link
              href="/cart"
              className="relative flex size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
              aria-label={`Cart, ${cartCount} items`}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 ? (
                <span className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:hidden"
              aria-label="Menu"
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
            {CATEGORY_TREE.map((parent) => (
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
            <MobileLink href="/account" onClick={() => setMobileOpen(false)}>
              My Account
            </MobileLink>
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
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-ink-100 text-ink-900"
          : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
      )}
    >
      {children}
    </Link>
  );
}

function CategoryDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="rounded-lg px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
      >
        Categories ▾
      </button>

      {open ? (
        <div className="absolute left-0 top-full mt-2 w-[720px] rounded-card border border-ink-200 bg-white p-6 shadow-lift">
          <div className="grid grid-cols-2 gap-6">
            {CATEGORY_TREE.map((parent) => (
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
      ) : null}
    </div>
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
