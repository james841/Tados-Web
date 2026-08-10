import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/layout/logo";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your Tados Web account to track orders, save a wishlist and check out faster.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    timeout?: string;
  }>;
}) {
  const session = await auth();
  const { callbackUrl, error, timeout } = await searchParams;

  // A timed-out admin still holds a valid session cookie for a moment, so the
  // redirect-if-signed-in below would bounce them straight back to /admin and
  // the notice would never show. Let the sign-out finish first.
  if (session?.user && timeout !== "1") redirect(callbackUrl ?? "/");

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        {timeout === "1" ? (
          <p
            role="status"
            className="mb-4 flex items-start gap-2.5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-600/20"
          >
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <span>
              You were signed out after 30 minutes of inactivity. Sign in again
              to continue.
            </span>
          </p>
        ) : null}

        <div className="rounded-card border border-ink-200 bg-white p-8 shadow-sm">
          <div className="flex justify-center">
            <Logo className="h-10" />
          </div>

          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Sign in to track orders and check out faster.
          </p>

          <Suspense fallback={<div className="skeleton mt-6 h-32 rounded-lg" />}>
            <LoginForm callbackUrl={callbackUrl} error={error} />
          </Suspense>

          <p className="mt-6 text-center text-sm text-ink-500">
            New to Tados Web?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand-700 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
