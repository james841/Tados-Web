import type { Metadata } from "next";
import { Suspense } from "react";

import { Catalogue, CatalogueSkeleton } from "@/components/product/catalogue";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Deals — Smart Security on Special",
  description: `Every ${SITE.name} product currently marked down: smart locks, alarms, switches and speakers at reduced prices, while stock lasts.`,
  alternates: { canonical: "/deals" },
  openGraph: {
    title: `Deals | ${SITE.name}`,
    description: "Smart security and automation currently on special.",
    url: `${SITE.url}/deals`,
  },
};

export default async function DealsPage({
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
          Deals
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          Everything currently below its usual price. Stock is limited and
          prices return to normal once it&apos;s gone.
        </p>
      </header>

      <Suspense key={key} fallback={<CatalogueSkeleton />}>
        <Catalogue
          params={params}
          fixedFilters={{ onSale: true }}
          emptyState={{
            title: "No deals running right now",
            description:
              "Nothing is marked down at the moment — check back soon, or browse the full range.",
          }}
        />
      </Suspense>
    </div>
  );
}
