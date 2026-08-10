import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, XCircle } from "lucide-react";

import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Payment cancelled",
  robots: { index: false, follow: false },
};

/**
 * PayFast `cancel_url` lands here.
 *
 * The cart is deliberately left alone — the customer walked away from the
 * payment page, not from their basket, so everything is still there when they
 * try again. The order row stays PENDING until PayFast sends a CANCELLED ITN or
 * an admin cancels it, which is what returns the stock.
 */
export default async function CheckoutCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;

  return (
    <div className="container-page max-w-2xl py-16">
      <div className="rounded-card border border-ink-200 bg-white p-8 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-ink-100 text-ink-500">
          <XCircle size={32} />
        </span>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-900">
          Payment cancelled
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm text-ink-600">
          Nothing was charged. Your cart is exactly as you left it, so you can
          pick up where you stopped whenever you&apos;re ready.
        </p>

        {orderNumber ? (
          <p className="mt-4 inline-block rounded-lg bg-ink-100 px-4 py-2 text-xs font-semibold text-ink-600">
            Reference {orderNumber}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/checkout" variant="primary">
            Try payment again
          </ButtonLink>
          <ButtonLink href="/cart" variant="outline">
            <ShoppingBag size={16} />
            Back to cart
          </ButtonLink>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Card declined or something looked wrong?{" "}
        <Link
          href="/contact"
          className="font-semibold text-brand-700 hover:underline"
        >
          Contact support
        </Link>{" "}
        and we&apos;ll sort it out.
      </p>
    </div>
  );
}
