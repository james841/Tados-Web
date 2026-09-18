import { Suspense, type ReactNode } from "react";

import {
  Hero,
  BrandStrip,
  PromoBand,
  DealBanners,
  LifestyleCta,
} from "@/components/home/hero";
import {
  CategoryCarousel,
  CategoryCarouselSkeleton,
} from "@/components/home/category-carousel";
import {
  NewArrivalsCarousel,
  NewArrivalsCarouselSkeleton,
} from "@/components/home/new-arrivals";
import { ProductGrid } from "@/components/product/product-card";
import { SectionHeading, ProductCardSkeleton } from "@/components/ui";
import {
  getDealStats,
  getFeaturedCategories,
  getFeaturedProducts,
  getNewArrivals,
} from "@/lib/queries";

/**
 * The two marketing bands read their percentages from the catalogue.
 *
 * Both are client components and both want the same Redis-cached query, so
 * they get a thin async wrapper each rather than making `HomePage` itself
 * async: the hero and the brand strip then still paint without waiting on a
 * number that only matters further down the page.
 */
async function PromoSection() {
  const { maxPercent } = await getDealStats();

  return <PromoBand maxPercent={maxPercent} />;
}

async function DealSection() {
  const { byCategory } = await getDealStats();

  return <DealBanners byCategory={byCategory} />;
}

/**
 * Suspense fallbacks for the two bands above.
 *
 * Both reserve the real card geometry — including the promo row's 1:2 split —
 * so nothing jumps when the query resolves, which is the one thing a fallback
 * exists to prevent.
 */
function PromoSkeleton() {
  return (
    <section className="container-page py-14 sm:py-20">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="skeleton h-[300px] rounded-lg" />
        <div className="skeleton h-[300px] rounded-lg lg:col-span-2" />
      </div>
    </section>
  );
}

function DealSkeleton() {
  return (
    <section className="container-page py-14 sm:py-20">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="skeleton h-[220px] rounded-lg sm:h-[260px]" />
        <div className="skeleton h-[220px] rounded-lg sm:h-[260px]" />
      </div>
    </section>
  );
}

async function CategorySection() {
  const categories = await getFeaturedCategories();

  return <CategoryCarousel categories={categories} />;
}

async function FeaturedSection() {
  const products = await getFeaturedProducts();

  return (
    <FeaturedBand>
      <SectionHeading
        eyebrow="Handpicked"
        title="Our Featured Collection"
        subtitle="The devices we're asked for most — smart locks, alarm panels and home automation, delivered anywhere in South Africa."
        href="/products"
        linkLabel="View all products"
      />
      <ProductGrid products={products} priorityCount={0} className="mt-6" />
    </FeaturedBand>
  );
}

/**
 * The one tinted band on the page.
 *
 * Everything between the hero and the dark call-to-action was the same white,
 * so five distinct sections read as one long scroll with headings in it. Giving
 * the product shelf its own ground is what separates them — and a tint rather
 * than another dark block because product photography needs a light background
 * to sit on, which is the whole reason this section exists.
 *
 * Shared with the Suspense fallback below so the band doesn't flash white and
 * then tint as the products resolve.
 *
 * The inner padding matches the `py-14 sm:py-20` every other section on the
 * page now uses. It was one step shorter, which on a band that also has rules
 * top and bottom made the shelf look cramped next to its neighbours.
 */
function FeaturedBand({ children }: { children: ReactNode }) {
  return (
    <section className="border-y border-ink-200 bg-ink-100">
      <div className="container-page py-14 sm:py-20">{children}</div>
    </section>
  );
}

async function NewArrivalsSection() {
  const products = await getNewArrivals(12);

  return <NewArrivalsCarousel products={products} />;
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <BrandStrip />
      <Suspense fallback={<CategoryCarouselSkeleton />}>
        <CategorySection />
      </Suspense>
      <Suspense fallback={<PromoSkeleton />}>
        <PromoSection />
      </Suspense>
      <Suspense
        fallback={
          <FeaturedBand>
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton mt-3 h-9 w-72 max-w-full rounded" />
            <div className="skeleton mt-3 h-4 w-[34rem] max-w-full rounded" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </FeaturedBand>
        }
      >
        <FeaturedSection />
      </Suspense>
      <Suspense fallback={<DealSkeleton />}>
        <DealSection />
      </Suspense>
      <LifestyleCta />
      {/* Last section on the page — the footer's trust strip follows it. */}
      <Suspense fallback={<NewArrivalsCarouselSkeleton />}>
        <NewArrivalsSection />
      </Suspense>
    </>
  );
}
