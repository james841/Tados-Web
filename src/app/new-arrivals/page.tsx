import type { Metadata } from "next";
import { Suspense } from "react";

import { Catalogue, CatalogueSkeleton } from "@/components/product/catalogue";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "New Arrivals — Just Landed",
  description:
    "The latest smart locks, alarm systems, Zigbee switches and ceiling speakers to arrive at Tados Web. Delivered across South Africa.",
  alternates: { canonical: "/new-arrivals" },
  openGraph: {
    title: `New Arrivals | ${SITE.name}`,
    description: "The latest smart security and automation hardware in stock.",
    url: `${SITE.url}/new-arrivals`,
  },
};

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const key = JSON.stringify(params);

  return (
    <div className="container-page py-8 sm:py-12">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          New Arrivals
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          Fresh stock, newest first — the latest additions to the Tados range.
        </p>
      </header>

      <Suspense key={key} fallback={<CatalogueSkeleton />}>
        <Catalogue
          params={params}
          fixedFilters={{ newArrivalsOnly: true }}
          emptyState={{
            title: "No new arrivals match those filters",
            description:
              "Try widening your price range, or browse the full range instead.",
          }}
        />
      </Suspense>
    </div>
  );
}
