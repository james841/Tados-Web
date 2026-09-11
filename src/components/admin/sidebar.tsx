"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Shapes,
  ShoppingCart,
  Store,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { clearAdminActivity } from "@/lib/admin-activity";
import { cn } from "@/lib/utils";
import { AdminOrderBell } from "@/components/admin/order-bell";
import { AdminThemeToggle } from "@/components/admin/theme-toggle";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Shapes },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

type AdminUser = { name?: string | null; email?: string | null };

/**
 * Admin navigation.
 *
 * Two presentations of one menu: a fixed column from `lg` up, and a top bar
 * plus slide-over drawer below it.
 *
 * The previous mobile treatment — the same column turned sideways into a
 * horizontally-scrolling strip — failed on both counts. Half the destinations
 * sat off the right edge with nothing to say so, and the account block was
 * `hidden lg:block`, which meant **Sign out** and **View storefront** simply did
 * not exist on a phone. A drawer fixes both: every link is visible at once, and
 * there is room underneath for the account controls.
 */
export function AdminSidebar({ user }: { user: AdminUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function handleSignOut() {
    setSigningOut(true);
    // Leave no stale activity timestamp behind, or the next sign-in trips the
    // idle check on its first admin navigation.
    clearAdminActivity();
    void signOut({ callbackUrl: "/" });
  }

  // Navigating closes the drawer. Without this it stays open over the page it
  // just loaded, and on a phone that page is entirely behind it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes, and the page behind is frozen while it's open — matching the
  // admin dialogs. Rotating a phone to landscape can also cross the `lg`
  // breakpoint, which would leave an invisible drawer holding the scroll lock,
  // so the same query that hides it also closes it.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const desktop = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = () => {
      if (desktop.matches) setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-ink-200 bg-surface px-3 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={open}
          aria-controls="admin-menu"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <Menu size={20} />
        </button>

        <BrandMark />

        {/* The bell and the theme toggle stay out here rather than going into
            the drawer. New orders are the reason anyone opens this panel on a
            phone, and a notification you have to open a menu to see is not a
            notification. */}
        <div className="ml-auto flex items-center gap-1">
          <AdminOrderBell />
          <AdminThemeToggle />
        </div>
      </header>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />

            <motion.div
              id="admin-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Admin menu"
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.22 }}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ink-200 px-4 py-3">
                <BrandMark />
                <button
                  type="button"
                  autoFocus
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-colors hover:bg-ink-200"
                >
                  <X size={16} />
                </button>
              </div>

              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                <NavLinks pathname={pathname} />
              </nav>

              <AccountBlock
                user={user}
                signingOut={signingOut}
                onSignOut={handleSignOut}
                className="shrink-0 border-t border-ink-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              />
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* ── Desktop column ─────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-surface px-4 py-6 lg:flex">
        <div className="mb-6 flex w-full items-center justify-between gap-2 px-2">
          <BrandMark />
          <div className="flex items-center gap-1">
            <AdminOrderBell />
            <AdminThemeToggle />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLinks pathname={pathname} />
        </nav>

        <AccountBlock
          user={user}
          signingOut={signingOut}
          onSignOut={handleSignOut}
          className="border-t border-ink-200 pt-4"
        />
      </aside>
    </>
  );
}

function BrandMark() {
  return (
    <Link
      href="/admin"
      aria-label="Tados admin dashboard"
      className="flex items-center gap-2"
    >
      <Image
        src="/logo-icon.png"
        alt=""
        width={262}
        height={256}
        priority
        // The knock-down to 42% is what makes the mark read as near-black on a
        // light sidebar. On a dark one it would sink into the background, so the
        // filter comes off and the original light mark is used.
        className="h-7 w-auto brightness-[0.42] dark:brightness-100"
      />
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
        Admin
      </span>
    </Link>
  );
}

/**
 * The six destinations, identical in both presentations.
 *
 * `py-2.5` rather than the old `py-2`: with the 17px icon that lands each row at
 * 42px tall, which clears the 40px a thumb needs. On desktop the extra two
 * pixels are invisible, so there's no breakpoint variant to maintain.
 */
function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {LINKS.map((link) => {
        // `/admin` would otherwise light up on every child route.
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-ink-900 text-ink-50"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            )}
          >
            <link.icon size={17} />
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

function AccountBlock({
  user,
  signingOut,
  onSignOut,
  className,
}: {
  user: AdminUser;
  signingOut: boolean;
  onSignOut: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="truncate px-3 text-sm font-medium text-ink-900">
        {user.name ?? "Admin"}
      </p>
      <p className="truncate px-3 text-xs text-ink-500">{user.email}</p>

      <Link
        href="/"
        className="mt-3 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
      >
        <Store size={17} />
        View storefront
      </Link>

      <button
        type="button"
        disabled={signingOut}
        onClick={onSignOut}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <LogOut size={17} />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
