/**
 * Admin idle-session policy.
 *
 * Kept in its own module because both halves of the timeout need these numbers
 * and they must never drift apart: the client timer in
 * `src/components/admin/idle-timeout.tsx` and the edge check in
 * `src/middleware.ts`. No imports here on purpose — middleware runs on the edge
 * runtime, so anything this file pulls in would have to be edge-safe too.
 */

/** Sign out after this long with no interaction. */
export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Show the countdown modal this long before the timeout fires. */
export const ADMIN_IDLE_WARNING_MS = 28 * 60 * 1000;

/**
 * Cookie holding the last-activity timestamp, in epoch milliseconds.
 *
 * Not `httpOnly`: the client writes it, and the point is a shared clock between
 * the tab and the edge, not a secret. It carries no authority of its own — the
 * JWT is still what proves who you are, and this only ever shortens a session.
 * Forging a fresh timestamp buys nothing you didn't already have with the token.
 */
export const ADMIN_ACTIVITY_COOKIE = "admin_last_active";

/**
 * Deliberately far longer than the idle window.
 *
 * If the cookie expired after 30 minutes it would vanish at the same instant it
 * became stale, and the edge check would have nothing left to read — the
 * backstop would silently never fire. Outliving the window is what lets
 * middleware see "this session went cold" instead of "no data".
 */
export const ADMIN_ACTIVITY_COOKIE_MAX_AGE_S = 24 * 60 * 60;

/** localStorage key used to keep the timer in sync across admin tabs. */
export const ADMIN_ACTIVITY_STORAGE_KEY = "tados-admin-last-active";

/**
 * How often activity is actually persisted. Without this, every mousemove
 * would write a cookie and a storage event, which is a lot of churn for a
 * 30-minute window.
 */
export const ADMIN_ACTIVITY_WRITE_INTERVAL_MS = 15 * 1000;

/** True when the recorded activity is older than the idle window. */
export function isAdminSessionStale(lastActive: number, now: number) {
  if (!Number.isFinite(lastActive) || lastActive <= 0) return false;
  // A clock skew or a cookie from the future should never lock an admin out.
  if (lastActive > now) return false;
  return now - lastActive > ADMIN_IDLE_TIMEOUT_MS;
}
