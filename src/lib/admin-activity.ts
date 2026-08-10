/**
 * Browser-side writes for the admin activity cookie.
 *
 * Split out from `@/lib/admin-session` on purpose: that module is imported by
 * `src/middleware.ts`, which runs on the edge runtime where `document` doesn't
 * exist. Keeping the DOM writes here means the edge bundle never sees them.
 */

import {
  ADMIN_ACTIVITY_COOKIE,
  ADMIN_ACTIVITY_COOKIE_MAX_AGE_S,
  ADMIN_ACTIVITY_STORAGE_KEY,
} from "@/lib/admin-session";

function secureFlag() {
  return window.location.protocol === "https:" ? "; Secure" : "";
}

export function writeAdminActivity(timestamp: number) {
  document.cookie = `${ADMIN_ACTIVITY_COOKIE}=${timestamp}; Path=/; Max-Age=${ADMIN_ACTIVITY_COOKIE_MAX_AGE_S}; SameSite=Lax${secureFlag()}`;

  try {
    window.localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, String(timestamp));
  } catch {
    // Private browsing can refuse localStorage. Cross-tab sync degrades; the
    // timer and the cookie both still work.
  }
}

/**
 * Call before any admin sign-out.
 *
 * Without this, the last-activity timestamp outlives the session. Sign out,
 * come back an hour later, sign in — and middleware reads that hour-old cookie
 * as a timed-out session and bounces you straight back to /login.
 */
export function clearAdminActivity() {
  document.cookie = `${ADMIN_ACTIVITY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag()}`;

  try {
    window.localStorage.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
  } catch {
    // Same as above — nothing depends on this succeeding.
  }
}
