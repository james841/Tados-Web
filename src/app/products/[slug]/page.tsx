import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product/product-detail";
import { ProductGrid } from "@/components/product/product-card";
import { SectionHeading } from "@/components/ui";
import { SITE } from "@/lib/constants";
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
        image: product.images.map((i) => `${SITE.url}${i.url}`),
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

  // The query layer returns DB-shaped rows; ProductDetail wants a flattened
  // view model. Mapping here keeps the component free of Prisma concerns.
  const detail = {
    ...product,
    shortDescription: product.tagline,
    brandName: product.brand?.name ?? null,
    categoryName: product.category.name,
  };

  return (
    <>
      <ProductSchema product={product} />

      <div className="container-page py-6">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink-900">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/products" className="hover:text-ink-900">
                Products
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/category/${product.category.slug}`}
                className="hover:text-ink-900"
              >
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-ink-900">
              {product.name}
            </li>
          </ol>
        </nav>
      </div>

      <ProductDetail product={detail} />

      {related.length > 0 ? (
        <section className="container-page py-12 sm:py-16">
          <SectionHeading title="You may also like" />
          <ProductGrid products={related} className="mt-6" />
        </section>
      ) : null}
    </>
  );
}
