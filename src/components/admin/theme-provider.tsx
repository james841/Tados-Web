"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ADMIN_THEME_COOKIE,
  ADMIN_THEME_COOKIE_MAX_AGE,
  type AdminTheme,
} from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

type AdminThemeContextValue = {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);

  if (!context) {
    throw new Error("useAdminTheme must be used within an AdminThemeProvider.");
  }

  return context;
}

/**
 * Owns the admin panel's `.dark` scope.
 *
 * `initialTheme` comes from the cookie, read on the server, so the very first
 * HTML already carries the right class. That ordering is the whole point: a
 * client-only implementation reading `localStorage` in an effect would paint a
 * light panel and then snap to dark, and reading it during render would produce
 * markup that disagrees with the server's and trip a hydration error.
 *
 * The class goes on this wrapper rather than `<html>` because the storefront
 * shares the same stylesheet and must stay light regardless of what an admin
 * picks here. No admin component portals out of this subtree, so the scope
 * reaches every dialog and popover.
 */
export function AdminThemeProvider({
  initialTheme,
  className,
  children,
}: {
  initialTheme: AdminTheme;
  className?: string;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<AdminTheme>(initialTheme);

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next);

    // Written straight to `document.cookie` instead of through a server action:
    // the class is driven by local state, so this is only here to be read on
    // the *next* page load. Making the toggle await a round-trip would add
    // latency to an interaction that has no reason to have any.
    const secure = window.location.protocol === "https:" ? ";secure" : "";
    document.cookie =
      `${ADMIN_THEME_COOKIE}=${next};path=/admin;samesite=lax` +
      `;max-age=${ADMIN_THEME_COOKIE_MAX_AGE}${secure}`;
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <AdminThemeContext.Provider value={value}>
      <div className={cn(theme === "dark" && "dark", className)}>{children}</div>
    </AdminThemeContext.Provider>
  );
}
