import { Suspense } from "react";

import {
  Hero,
  BrandStrip,
  PromoBand,
  DealBanners,
  LifestyleCta,
} from "@/components/home/hero";
import { ProductGrid } from "@/components/product/product-card";
import { SectionHeading, ProductCardSkeleton } from "@/components/ui";
import { getFeaturedProducts } from "@/lib/queries";

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

export default function HomePage() {
  return (
    <>
      <Hero />
      <BrandStrip />
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
    </>
  );
}
