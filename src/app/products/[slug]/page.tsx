import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, ShieldCheckIcon, TruckIcon, RefreshCwIcon, ArrowRightIcon } from "lucide-react";

import { ProductDetail } from "@/components/product/product-detail";
import { ProductGrid } from "@/components/product/product-card";
import { SectionHeading } from "@/components/ui";
import { SITE, absoluteUrl } from "@/lib/constants";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/queries";

/** Pre-render every product at build time for instant navigation + SEO. */
export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product not found", robots: { index: false } };
  }

  const title = product.metaTitle ?? product.name;
  const description =
    product.metaDescription ??
    product.tagline ??
    product.description.slice(0, 160);
  const image = product.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${title} | ${SITE.name}`,
      description,
      url: `${SITE.url}/products/${product.slug}`,
      images: image
        ? [{ url: image, width: 1200, height: 1200, alt: product.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE.name}`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** Product + Offer + AggregateRating + Breadcrumb structured data. */
function ProductSchema({
  product,
}: {
  product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;
}) {
  const url = `${SITE.url}/products/${product.slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}/#product`,
        name: product.name,
        description: product.tagline ?? product.description.slice(0, 300),
        sku: product.sku,
        image: product.images.map((i) => absoluteUrl(i.url)),
        brand: product.brand
          ? { "@type": "Brand", name: product.brand.name }
          : undefined,
        category: product.category.name,
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "ZAR",
          price: Number(product.price).toFixed(2),
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": `${SITE.url}/#organization` },
        },
        ...(product.ratingCount > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: product.ratingAvg.toFixed(1),
                reviewCount: product.ratingCount,
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          {
            "@type": "ListItem",
            position: 2,
            name: "Products",
            item: `${SITE.url}/products`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: product.category.name,
            item: `${SITE.url}/category/${product.category.slug}`,
          },
          { "@type": "ListItem", position: 4, name: product.name, item: url },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categoryId, 4);

  const detail = {
    ...product,
    shortDescription: product.tagline,
    brandName: product.brand?.name ?? null,
    categoryName: product.category.name,
  };

  return (
    <main className="min-h-screen">
      <ProductSchema product={product} />

      {/* Styled Header & Breadcrumbs */}
      <div className="border-b border-ink-500/10 bg-slate-50/50">
        <div className="container-page py-4">
          <nav aria-label="Breadcrumb" className="text-xs sm:text-sm text-ink-500">
            <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-ink-900"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="opacity-40">
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </li>
              <li>
                <Link
                  href="/products"
                  className="transition-colors hover:text-ink-900"
                >
                  Products
                </Link>
              </li>
              <li aria-hidden="true" className="opacity-40">
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </li>
              <li>
                <Link
                  href={`/category/${product.category.slug}`}
                  className="transition-colors hover:text-ink-900"
                >
                  {product.category.name}
                </Link>
              </li>
              <li aria-hidden="true" className="opacity-40">
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </li>
              <li
                aria-current="page"
                className="font-semibold text-ink-900 truncate max-w-[200px] sm:max-w-xs"
              >
                {product.name}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Hero Product Detail Container */}
      <section className="container-page py-6 sm:py-10">
        <ProductDetail product={detail} />
      </section>

      {/* Value Proposition Micro-Banner */}
      <section className="border-y border-ink-500/10 bg-slate-50/60 py-8 my-12">
        <div className="container-page grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-3">
            <TruckIcon className="h-6 w-6 text-ink-900 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink-900">Fast Nationwide Delivery</p>
              <p className="text-xs text-ink-500">Reliable shipping direct to your door</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start space-x-3">
            <ShieldCheckIcon className="h-6 w-6 text-ink-900 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink-900">100% Secure Checkout</p>
              <p className="text-xs text-ink-500">Encrypted payment processing</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start space-x-3">
            <RefreshCwIcon className="h-6 w-6 text-ink-900 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink-900">Hassle-Free Returns</p>

              <p className="text-xs text-ink-500">Easy returns within 30 days</p>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products Section */}
      {related.length > 0 ? (
        <section className="container-page py-8 sm:py-12 mb-16">
          <div className="flex items-end justify-between mb-8 border-b border-ink-500/10 pb-4">
            <div>
              <span className="text-xs font-semibold tracking-wider text-ink-500 uppercase">
                Curated Suggestions
              </span>
              <SectionHeading title="You may also like" className="mt-1" />
            </div>
            <Link
              href={`/category/${product.category.slug}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-ink-900 hover:opacity-80 transition-opacity"
            >
              View collection <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <ProductGrid products={related} className="mt-6" />
        </section>
      ) : null}
    </main>
  );
}