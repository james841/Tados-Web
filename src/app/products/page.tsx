import type { Metadata } from "next";
import { Suspense } from "react";

import { Catalogue, CatalogueSkeleton } from "@/components/product/catalogue";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "All Products — Smart Locks, Alarms & Automation",
  description:
    "Browse the full Tados Web range: 3D facial recognition door locks, fingerprint locks, smart padlocks, alarm systems, Zigbee switches, ceiling speakers and curtain kits. Delivered across South Africa.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: `All Products | ${SITE.name}`,
    description:
      "Smart locks, security alarms and home automation, delivered across South Africa.",
    url: `${SITE.url}/products`,
  },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // The key forces a fresh Suspense boundary whenever filters change, so the
  // skeleton reappears instead of showing stale results during the refetch.
  const key = JSON.stringify(params);

  return (
    <div className="container-page py-8 sm:py-12">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          All Products
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          Smart security and home automation hardware, in stock and shipping
          across South Africa.
        </p>
      </header>

      <Suspense key={key} fallback={<CatalogueSkeleton />}>
        <Catalogue params={params} />
      </Suspense>
    </div>
  );
}
