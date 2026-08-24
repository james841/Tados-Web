import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Your Cart",
  description: `Review the items in your ${SITE.name} cart before checking out.`,
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
        Your Cart
      </h1>
      <CartView />
    </div>
  );
}
