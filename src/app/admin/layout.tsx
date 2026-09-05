import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminFeedbackProvider } from "@/components/admin/feedback";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminThemeProvider } from "@/components/admin/theme-provider";
import { IdleTimeout } from "@/components/admin/idle-timeout";
import { ADMIN_THEME_COOKIE, parseAdminTheme } from "@/lib/admin-theme";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Admin · Tados",
  // The dashboard must never be indexed, even if a URL leaks.
  robots: { index: false, follow: false },
};

/**
 * Admin shell.
 *
 * The middleware already blocks non-admins at the edge; this second check
 * covers the case where the JWT is stale — the role could have been revoked in
 * the database since the token was minted, and the token itself wouldn't know.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login?callbackUrl=/admin");
  if (user.role !== "ADMIN") redirect("/");

  // Read here rather than in the provider so the first byte of HTML already
  // carries the right theme — no flash of the wrong one, no hydration mismatch.
  const theme = parseAdminTheme(
    (await cookies()).get(ADMIN_THEME_COOKIE)?.value,
  );

  return (
    <AdminThemeProvider
      initialTheme={theme}
      className="flex min-h-screen bg-ink-50"
    >
      <IdleTimeout />
      <AdminSidebar user={{ name: user.name, email: user.email }} />
      <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">
        {/* Inside the theme wrapper, not portalled to `document.body`: the
            `.dark` class is scoped to that wrapper, so a portalled ledger would
            paint in light mode over a dark panel. Its own elements are `fixed`,
            so sitting inside `<main>` costs nothing in layout terms. */}
        <AdminFeedbackProvider>{children}</AdminFeedbackProvider>
      </main>
    </AdminThemeProvider>
  );
}
