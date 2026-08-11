import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ShoppingBag } from "lucide-react";

import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Catches both a bad URL and any `notFound()` call that no closer boundary
 * handles — a deleted product slug, a category that was renamed.
 *
 * A Server Component, so it costs no client JavaScript: this page exists to send
 * people somewhere useful, not to do anything.
 */
export default function NotFound() {
  return (
    <div className="container-page max-w-2xl py-16">
      <div className="rounded-card border border-ink-200 bg-white p-8 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-ink-100 text-ink-500">
          <Compass size={32} />
        </span>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-900">
          We couldn&apos;t find that page
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm text-ink-600">
          The link may be out of date, or the product might have moved. Our full
          range is a click away.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/products" variant="primary">
            <ShoppingBag size={16} />
            Browse products
          </ButtonLink>
          <ButtonLink href="/" variant="outline">
            Back to home
          </ButtonLink>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Looking for something specific?{" "}
        <Link
          href="/contact"
          className="font-semibold text-brand-700 hover:underline"
        >
          Ask us
        </Link>{" "}
        and we&apos;ll point you at it.
      </p>
    </div>
  );
}
