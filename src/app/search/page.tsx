import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";

import { Catalogue, CatalogueSkeleton } from "@/components/product/catalogue";
import { EmptyState } from "@/components/ui";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Search",
  description: `Search the ${SITE.name} range of smart locks, alarms and home automation.`,
  // Search-result URLs are thin, near-duplicate pages — keep them out of the index.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = raw?.trim() ?? "";
  const key = JSON.stringify(params);

  return (
    <div className="container-page py-8 sm:py-12">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {query ? `Results for “${query}”` : "Search"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          Search by product name, category or brand.
        </p>

        {/* A plain GET form: works without JS, and the URL stays shareable. */}
        <form action="/search" method="GET" className="mt-5 max-w-md">
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Try “fingerprint lock”"
              autoFocus={!query}
              className="w-full rounded-lg border border-ink-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-ink-900"
            />
          </div>
        </form>
      </header>

      {query.length < 2 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Search size={40} />}
            title={query ? "Keep typing" : "What are you looking for?"}
            description="Enter at least two characters to search the catalogue."
          />
        </div>
      ) : (
        <Suspense key={key} fallback={<CatalogueSkeleton />}>
          <Catalogue
            params={params}
            emptyState={{
              title: `Nothing matched “${query}”`,
              description:
                "Check the spelling, try a broader term, or browse the full range.",
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
