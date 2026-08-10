import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/sidebar";
import { IdleTimeout } from "@/components/admin/idle-timeout";
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

  return (
    <div className="flex min-h-screen bg-ink-50">
      <IdleTimeout />
      <AdminSidebar user={{ name: user.name, email: user.email }} />
      <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
