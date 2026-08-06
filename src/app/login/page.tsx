import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
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
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;

  if (session?.user) redirect(callbackUrl ?? "/");

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="rounded-card border border-ink-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
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
