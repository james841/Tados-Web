import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  ADMIN_ACTIVITY_COOKIE,
  isAdminSessionStale,
} from "@/lib/admin-session";

/**
 * Edge guard for the admin area.
 *
 * This runs before the admin pages render, so a customer never sees a flash of
 * the dashboard before a client-side redirect kicks in. It reads the JWT
 * directly rather than calling `auth()`, because the full NextAuth handler
 * pulls in the Prisma adapter, which cannot run on the edge runtime.
 *
 * This is the first of two doors: the API routes re-check the role themselves,
 * since middleware only covers navigation to the pages.
 */
export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    // Auth.js v5 prefixes the cookie with `__Secure-` over HTTPS; without this
    // the token reads as null in production and every admin is bounced.
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    const login = new URL("/login", request.url);
    // Send them back where they were headed once signed in.
    login.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Idle-session check. The JWT is still valid, but the admin hasn't touched
  // the site for the idle window, so the session is over. The client timer
  // (IdleTimeout) normally signs out before this ever fires; this is the
  // backstop that catches closed browsers, disabled JS and multi-tab drift.
  const rawActivity = request.cookies.get(ADMIN_ACTIVITY_COOKIE)?.value;
  const lastActive = rawActivity ? Number(rawActivity) : Number.NaN;

  if (isAdminSessionStale(lastActive, Date.now())) {
    const login = new URL("/login", request.url);
    login.searchParams.set("timeout", "1");
    login.searchParams.set("callbackUrl", request.nextUrl.pathname);

    const response = NextResponse.redirect(login);

    // Redirecting alone isn't enough — the session cookie would still be valid
    // and the stale activity cookie would still be stale, so the next admin
    // navigation would bounce again, forever. Ending the session here is what
    // makes the timeout real rather than cosmetic.
    expireCookie(response, ADMIN_ACTIVITY_COOKIE);
    for (const cookie of request.cookies.getAll()) {
      if (SESSION_COOKIE_PATTERN.test(cookie.name)) {
        expireCookie(response, cookie.name);
      }
    }

    return response;
  }

  return NextResponse.next();
}

/**
 * Auth.js session cookie, across every name it can take: the v5 (`authjs`) and
 * v4 (`next-auth`) prefixes, the `__Secure-` variant used over HTTPS, and the
 * numbered chunks a large OAuth token gets split into.
 */
const SESSION_COOKIE_PATTERN =
  /^(__Secure-)?(authjs|next-auth)\.session-token(\.\d+)?$/;

function expireCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", {
    path: "/",
    maxAge: 0,
    // A `__Secure-` cookie is only accepted — and only cleared — when the
    // Set-Cookie carries the Secure attribute.
    secure: name.startsWith("__Secure-"),
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
