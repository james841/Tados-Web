import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Secure checkout powered by PayFast. Fast, safe delivery across South Africa.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="container-page py-10">
      <SectionHeading
        title="Checkout"
        subtitle="You'll be redirected to PayFast to complete your payment securely."
      />

      <Suspense
        fallback={
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="skeleton h-[520px] rounded-card" />
            <div className="skeleton h-72 rounded-card" />
          </div>
        }
      >
        <CheckoutForm />
      </Suspense>

      <p className="mt-8 text-center text-sm text-ink-500">
        Changed your mind?{" "}
        <Link href="/cart" className="font-semibold text-brand-700 hover:underline">
          Return to cart
        </Link>
      </p>
    </div>
  );
}
