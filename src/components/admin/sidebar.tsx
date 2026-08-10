"use client";

import {
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Shapes,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

import { clearAdminActivity } from "@/lib/admin-activity";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Shapes },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/**
 * Admin navigation.
 *
 * Collapses to a horizontal bar under `lg` rather than hiding behind a hamburger
 * — the handful of destinations scroll horizontally if they don't all fit.
 */
export function AdminSidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null };
}) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full shrink-0 flex-row items-center gap-2 overflow-x-auto border-b border-ink-200 bg-white px-4 py-3 lg:h-screen lg:w-60 lg:flex-col lg:items-stretch lg:overflow-visible lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
      <Link
        href="/admin"
        aria-label="Tados admin dashboard"
        className="mr-2 flex shrink-0 items-center gap-2 lg:mb-6 lg:mr-0 lg:px-2"
      >
        <Image
          src="/logo-icon.png"
          alt=""
          width={262}
          height={256}
          priority
          className="h-7 w-auto brightness-[0.42]"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          Admin
        </span>
      </Link>

      <nav className="flex flex-1 flex-row gap-1 lg:flex-col">
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
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
              )}
            >
              <link.icon size={17} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-ink-200 pt-4 lg:block">
        <p className="truncate px-3 text-sm font-medium text-ink-900">
          {user.name ?? "Admin"}
        </p>
        <p className="truncate px-3 text-xs text-ink-500">{user.email}</p>

        <Link
          href="/"
          className="mt-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <Store size={17} />
          View storefront
        </Link>

        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            // Leave no stale activity timestamp behind, or the next sign-in
            // trips the idle check on its first admin navigation.
            clearAdminActivity();
            void signOut({ callbackUrl: "/" });
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <LogOut size={17} />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
