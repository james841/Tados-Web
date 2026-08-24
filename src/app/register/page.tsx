import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { RegisterForm } from "@/components/auth/register-form";
import { Logo } from "@/components/layout/logo";
import { auth } from "@/lib/auth";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Create an account",
  description: `Create your ${SITE.name} account to track orders, save a wishlist and check out faster.`,
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  if (session?.user) redirect(callbackUrl ?? "/account");

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="rounded-card border border-ink-200 bg-white p-8 shadow-sm">
          <div className="flex justify-center">
            <Logo className="h-10" />
          </div>

          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Track orders, save a wishlist and check out faster.
          </p>

          <Suspense fallback={<div className="skeleton mt-6 h-32 rounded-lg" />}>
            <RegisterForm callbackUrl={callbackUrl} />
          </Suspense>

          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
