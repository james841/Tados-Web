import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Catalogue, CatalogueSkeleton } from "@/components/product/catalogue";
import { SITE } from "@/lib/constants";
import { getCategoryBySlug, getCategoryTree } from "@/lib/queries";

/** Pre-render every category (parents and children) at build time. */
export async function generateStaticParams() {
  const tree = await getCategoryTree();
  return tree.flatMap((parent) => [
    { slug: parent.slug },
    ...(parent.children ?? []).map((child) => ({ slug: child.slug })),
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return { title: "Category not found", robots: { index: false } };
  }

  const description =
    category.description ??
    `Shop ${category.name} at ${SITE.name}. Delivered across South Africa.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      title: `${category.name} | ${SITE.name}`,
      description,
      url: `${SITE.url}/category/${category.slug}`,
      images: category.image ? [{ url: category.image }] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);

  if (!category) notFound();

  // Lock the catalogue to this category regardless of what's in the URL.
  const scopedParams = { ...query, category: category.slug };
  const key = JSON.stringify(scopedParams);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
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
        name: category.name,
        item: `${SITE.url}/category/${category.slug}`,
      },
    ],
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-500">
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
          <li aria-current="page" className="font-medium text-ink-900">
            {category.name}
          </li>
        </ol>
      </nav>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            {category.description}
          </p>
        ) : null}
      </header>

      {/* Sub-category chips, so shoppers can drill down without the filter panel. */}
      {category.children && category.children.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}`}
              className="rounded-full border border-ink-200 bg-white px-4 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-ink-900 hover:text-ink-900"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

      <Suspense key={key} fallback={<CatalogueSkeleton />}>
        <Catalogue params={scopedParams} categorySlug={category.slug} />
      </Suspense>
    </div>
  );
}
