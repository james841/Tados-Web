import { Suspense } from "react";

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
  getFeaturedCategories,
  getFeaturedProducts,
  getNewArrivals,
} from "@/lib/queries";

async function CategorySection() {
  const categories = await getFeaturedCategories();

  return <CategoryCarousel categories={categories} />;
}

async function FeaturedSection() {
  const products = await getFeaturedProducts();

  return (
    <section className="container-page py-12 sm:py-16">
      <SectionHeading
        title="Our Featured Collection"
        href="/products"
        linkLabel="View all products"
      />
      <ProductGrid products={products} priorityCount={0} className="mt-6" />
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
      <PromoBand />
      <Suspense
        fallback={
          <div className="container-page py-12">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        }
      >
        <FeaturedSection />
      </Suspense>
      <DealBanners />
      <LifestyleCta />
      {/* Last section on the page — the footer's trust strip follows it. */}
      <Suspense fallback={<NewArrivalsCarouselSkeleton />}>
        <NewArrivalsSection />
      </Suspense>
    </>
  );
}
