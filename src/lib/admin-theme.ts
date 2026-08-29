/**
 * Admin colour-theme constants.
 *
 * Deliberately free of `next/headers` and any other server-only import: both
 * the Server Component layout (which reads the cookie) and the client toggle
 * (which writes it) need these values, and pulling `cookies()` into this module
 * would make it unimportable from the client half.
 */

export const ADMIN_THEME_COOKIE = "tados_admin_theme";

export type AdminTheme = "light" | "dark";

/** One year. The choice should outlive the session that made it. */
export const ADMIN_THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Narrows an arbitrary cookie value to a theme.
 *
 * Anything unrecognised — a missing cookie, a stale value from an earlier
 * format, someone editing it by hand — falls back to light rather than
 * throwing, so a bad cookie can never break the admin shell.
 */
export function parseAdminTheme(value: string | undefined): AdminTheme {
  return value === "dark" ? "dark" : "light";
}
