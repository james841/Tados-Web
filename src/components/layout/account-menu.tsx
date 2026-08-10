"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  Package,
  User,
  UserCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** "Ada Lovelace" -> "AL". Fallback when Google has no avatar for the account. */
function initialsOf(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";

  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Header account control.
 *
 * Signed out it's a plain link to /login, so the icon behaves exactly as it did
 * before. Signed in it opens a dropdown showing the Google avatar and the
 * account's email address, plus the admin link when the role allows it.
 *
 * The Admin entry is convenience only — `src/middleware.ts` and `requireAdmin()`
 * are what actually enforce the role. Hiding a link is not access control.
 */
export function AccountMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Focus has to go somewhere sensible, or Escape strands the keyboard user.
      buttonRef.current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const user = session?.user;

  // `status` is "loading" on first paint. Rendering the signed-out link during
  // that window would flash a login icon at users who are, in fact, signed in.
  if (status === "loading") {
    return (
      <div
        className="hidden size-10 items-center justify-center sm:flex"
        aria-hidden="true"
      >
        <span className="size-8 animate-pulse rounded-full bg-ink-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="hidden size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 sm:flex"
        aria-label="Sign in"
      >
        <User size={20} />
      </Link>
    );
  }

  const initials = initialsOf(user.name, user.email);

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          "flex size-10 items-center justify-center rounded-lg transition-colors",
          open ? "bg-ink-100" : "hover:bg-ink-100",
        )}
        aria-label={`Account menu for ${user.email ?? user.name ?? "your account"}`}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full object-cover ring-1 ring-ink-200"
            // Google serves these at a fixed size and they're never the LCP.
            unoptimized
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {initials}
          </span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-card border border-ink-200 bg-white shadow-lift"
        >
          <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3.5">
            {user.image ? (
              <Image
                src={user.image}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover ring-1 ring-ink-200"
                unoptimized
              />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {initials}
              </span>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">
                {user.name ?? "My account"}
              </p>
              {/* The email is the point of the menu — it's how you confirm which
                  Google account you're actually signed in with. */}
              <p className="truncate text-xs text-ink-500" title={user.email ?? undefined}>
                {user.email}
              </p>
            </div>
          </div>

          <div className="p-1.5">
            <MenuLink
              href="/account"
              icon={<UserCircle size={17} />}
              onSelect={() => setOpen(false)}
            >
              My account
            </MenuLink>
            <MenuLink
              href="/account#orders"
              icon={<Package size={17} />}
              onSelect={() => setOpen(false)}
            >
              My orders
            </MenuLink>

            {user.role === "ADMIN" ? (
              <MenuLink
                href="/admin"
                icon={<LayoutDashboard size={17} />}
                onSelect={() => setOpen(false)}
              >
                Admin dashboard
              </MenuLink>
            ) : null}
          </div>

          <div className="border-t border-ink-200 p-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut({ redirect: false });
                setOpen(false);
                // refresh() so every server component re-reads the now-empty
                // session; without it the page keeps rendering as signed in.
                router.refresh();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <LogOut size={17} />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onSelect,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
    >
      {icon}
      {children}
    </Link>
  );
}
