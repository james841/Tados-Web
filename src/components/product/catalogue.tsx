import Link from "next/link";
import { PackageSearch } from "lucide-react";

import { ProductGrid } from "@/components/product/product-card";
import { ProductFilters, SortSelect } from "@/components/product/filters";
import { ProductGridSkeleton, EmptyState, ButtonLink } from "@/components/ui";
import { getProducts, getAllBrands } from "@/lib/queries";
import type { ProductFilters as ProductFilterInput } from "@/lib/queries";
import type { SortOption } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Shared catalogue body: filter sidebar + product grid + pagination.
 *
 * This lives outside the route files because a Next.js `page.tsx` may only
 * export a known set of members (default, metadata, generateStaticParams…).
 * /products, /category/[slug], /bestsellers, /new-arrivals and /deals all
 * render this.
 */
export async function Catalogue({
  params,
  categorySlug,
  fixedFilters,
  emptyState,
}: {
  params: Record<string, string | string[] | undefined>;
  categorySlug?: string;
  /**
   * Filters the route enforces regardless of the query string — e.g. /deals is
   * always `onSale`. Applied last so a URL param can't switch them off.
   */
  fixedFilters?: Pick<
    ProductFilterInput,
    "onSale" | "inStock" | "bestsellersOnly" | "newArrivalsOnly"
  >;
  emptyState?: { title: string; description: string };
}) {
  const brandParam = params.brand;
  const brandSlugs = Array.isArray(brandParam)
    ? brandParam
    : brandParam
      ? [brandParam]
      : undefined;

  const asString = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const asNumber = (value: string | string[] | undefined) => {
    const raw = asString(value);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const [result, brands] = await Promise.all([
    getProducts({
      categorySlug,
      brandSlugs,
      minPrice: asNumber(params.minPrice),
      maxPrice: asNumber(params.maxPrice),
      search: asString(params.q),
      sort: (asString(params.sort) ?? "newest") as SortOption,
      page: asNumber(params.page) ?? 1,
      onSale: asString(params.onSale) === "1",
      inStock: asString(params.inStock) === "1",
      ...fixedFilters,
    }),
    getAllBrands(),
  ]);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
      <ProductFilters brands={brands} priceRange={result.priceRange} />

      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-500">
            {result.total} {result.total === 1 ? "product" : "products"}
          </p>
          <SortSelect />
        </div>

        {result.products.length === 0 ? (
          <EmptyState
            icon={<PackageSearch size={40} />}
            title={emptyState?.title ?? "No products match those filters"}
            description={
              emptyState?.description ??
              "Try widening your price range or clearing a brand filter."
            }
            action={
              <ButtonLink href="/products" variant="dark">
                Browse all products
              </ButtonLink>
            }
          />
        ) : (
          <>
            <ProductGrid products={result.products} priorityCount={4} />
            <Pagination page={result.page} totalPages={result.totalPages} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Pagination rendered as real <Link>s.
 *
 * Using links rather than a click handler means crawlers can reach every page
 * of the catalogue, and Next prefetches the next page on hover.
 */
function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-2"
    >
      {page > 1 ? <PageLink page={page - 1} label="Previous" /> : null}

      {pages.map((p, index) => (
        <span key={p} className="flex items-center gap-2">
          {index > 0 && p - pages[index - 1] > 1 ? (
            <span className="text-ink-400">…</span>
          ) : null}
          <PageLink page={p} label={String(p)} active={p === page} />
        </span>
      ))}

      {page < totalPages ? <PageLink page={page + 1} label="Next" /> : null}
    </nav>
  );
}

function PageLink({
  page,
  label,
  active,
}: {
  page: number;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={`?page=${page}`}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors",
        active
          ? "bg-ink-900 text-white"
          : "border border-ink-200 text-ink-700 hover:border-ink-900 hover:text-ink-900",
      )}
    >
      {label}
    </Link>
  );
}

/** Loading state for the whole catalogue view. */
export function CatalogueSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
      <div className="hidden space-y-4 lg:block">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-card" />
        ))}
      </div>
      <ProductGridSkeleton count={12} />
    </div>
  );
}
