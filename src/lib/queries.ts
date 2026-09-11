import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { cached, cacheKeys } from "@/lib/redis";
import {
  SEARCH_MIN_LENGTH,
  SEARCH_SUGGESTION_LIMIT,
  normaliseSearchTerm,
  type SearchLanding,
  type SearchSuggestion,
} from "@/lib/search";
import { PRODUCTS_PER_PAGE, type SortOption } from "@/lib/constants";
import { toNumber } from "@/lib/utils";

/**
 * Catalogue read layer.
 *
 * Every function returns plain serialisable objects (Decimal -> number) so the
 * results can cross the server/client boundary and be JSON-cached in Redis.
 */

// ---------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------

const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  ratingAvg: true,
  ratingCount: true,
  isBestseller: true,
  isNewArrival: true,
  isFeatured: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true, slug: true } },
  images: {
    select: { url: true, alt: true },
    orderBy: { position: "asc" },
    take: 2,
  },
} satisfies Prisma.ProductSelect;

type ProductCardRow = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  isBestseller: boolean;
  isNewArrival: boolean;
  isFeatured: boolean;
  categoryName: string;
  categorySlug: string;
  brandName: string | null;
  image: string | null;
  imageAlt: string | null;
  hoverImage: string | null;
}

function toProductCard(row: ProductCardRow): ProductCardData {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline,
    price: toNumber(row.price),
    compareAtPrice: row.compareAtPrice ? toNumber(row.compareAtPrice) : null,
    stock: row.stock,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    isBestseller: row.isBestseller,
    isNewArrival: row.isNewArrival,
    isFeatured: row.isFeatured,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    brandName: row.brand?.name ?? null,
    image: row.images[0]?.url ?? null,
    imageAlt: row.images[0]?.alt ?? row.name,
    hoverImage: row.images[1]?.url ?? null,
  };
}

function orderByFor(sort: SortOption): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }];
    case "price-desc":
      return [{ price: "desc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
    case "name":
      return [{ name: "asc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

// ---------------------------------------------------------------
// Categories
// ---------------------------------------------------------------

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  productCount: number;
  children: CategoryNode[];
}

/** Full two-level tree used by the header dropdown and the footer. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  return cached(cacheKeys.categoryTree, 3600, async () => {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        icon: true,
        _count: { select: { products: true } },
        children: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            image: true,
            icon: true,
            _count: { select: { products: true } },
          },
        },
      },
    });

    return categories.map((parent) => ({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
      description: parent.description,
      image: parent.image,
      icon: parent.icon,
      // A parent's count is the sum of its children — products live on leaves.
      productCount:
        parent._count.products +
        parent.children.reduce((sum, c) => sum + c._count.products, 0),
      children: parent.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        description: child.description,
        image: child.image,
        icon: child.icon,
        productCount: child._count.products,
        children: [],
      })),
    }));
  });
}

export interface FeaturedCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  icon: string | null;
  productCount: number;
  parentName: string | null;
}

/**
 * Sub-categories flagged for the home "Popular Categories" rail.
 *
 * `featured` is the admin's "Show on homepage" toggle, so what appears here is
 * an explicit editorial choice rather than a derived rule. Empty categories are
 * allowed through — an admin who ticks the box for a category they're about to
 * stock shouldn't have the tile silently withheld.
 *
 * `position` restarts at 0 inside every parent, so sorting on it alone
 * interleaves siblings from different parents in an arbitrary order. Sorting
 * by the parent's position first keeps the rail grouped the same way the
 * header dropdown is, and makes the output stable enough to cache.
 */
export async function getFeaturedCategories(): Promise<FeaturedCategory[]> {
  return cached(cacheKeys.featuredCategories, 3600, async () => {
    const categories = await prisma.category.findMany({
      where: { parentId: { not: null }, featured: true },
      orderBy: [
        { parent: { position: "asc" } },
        { position: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        icon: true,
        parent: { select: { name: true } },
        _count: { select: { products: true } },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      icon: c.icon,
      productCount: c._count.products,
      parentName: c.parent?.name ?? null,
    }));
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      parent: { select: { name: true, slug: true } },
      children: { select: { id: true, name: true, slug: true } },
    },
  });
}

// ---------------------------------------------------------------
// Home page collections
// ---------------------------------------------------------------

export async function getBestsellers(limit = 8): Promise<ProductCardData[]> {
  return cached(cacheKeys.homeBestsellers, 600, async () => {
    const rows = await prisma.product.findMany({
      where: { isActive: true, isBestseller: true },
      orderBy: [{ ratingCount: "desc" }, { ratingAvg: "desc" }],
      take: limit,
      select: productCardSelect,
    });
    return rows.map(toProductCard);
  });
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  return cached(cacheKeys.homeFeatured, 600, async () => {
    const rows = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: productCardSelect,
    });
    return rows.map(toProductCard);
  });
}

export async function getNewArrivals(limit = 8): Promise<ProductCardData[]> {
  return cached(cacheKeys.homeNewArrivals, 600, async () => {
    const rows = await prisma.product.findMany({
      where: { isActive: true, isNewArrival: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: productCardSelect,
    });
    return rows.map(toProductCard);
  });
}

// ---------------------------------------------------------------
// Catalogue listing + filtering
// ---------------------------------------------------------------

export interface ProductFilters {
  categorySlug?: string;
  brandSlugs?: string[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: SortOption;
  page?: number;
  perPage?: number;
  onSale?: boolean;
  inStock?: boolean;
  bestsellersOnly?: boolean;
  newArrivalsOnly?: boolean;
}

export interface ProductListResult {
  products: ProductCardData[];
  total: number;
  page: number;
  totalPages: number;
  priceRange: { min: number; max: number };
}

async function buildWhere(
  filters: ProductFilters,
): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (filters.categorySlug) {
    // Selecting a parent category must include everything beneath it.
    const category = await prisma.category.findUnique({
      where: { slug: filters.categorySlug },
      select: { id: true, children: { select: { id: true } } },
    });

    if (category) {
      const ids = [category.id, ...category.children.map((c) => c.id)];
      where.categoryId = { in: ids };
    } else {
      // Unknown slug => deliberately match nothing rather than everything.
      where.categoryId = "__none__";
    }
  }

  if (filters.brandSlugs?.length) {
    where.brand = { slug: { in: filters.brandSlugs } };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
  }

  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { tagline: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { category: { name: { contains: term, mode: "insensitive" } } },
      { brand: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (filters.onSale) where.compareAtPrice = { not: null };
  if (filters.inStock) where.stock = { gt: 0 };
  if (filters.bestsellersOnly) where.isBestseller = true;
  if (filters.newArrivalsOnly) where.isNewArrival = true;

  return where;
}

export async function getProducts(
  filters: ProductFilters = {},
): Promise<ProductListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? PRODUCTS_PER_PAGE;
  const sort = filters.sort ?? "newest";

  const where = await buildWhere(filters);

  // One round-trip for the page, the count, and the slider bounds.
  const [rows, total, aggregate] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: orderByFor(sort),
      skip: (page - 1) * perPage,
      take: perPage,
      select: productCardSelect,
    }),
    prisma.product.count({ where }),
    prisma.product.aggregate({
      where: { isActive: true },
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  return {
    products: rows.map(toProductCard),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    priceRange: {
      min: Math.floor(toNumber(aggregate._min.price)),
      max: Math.ceil(toNumber(aggregate._max.price)) || 10000,
    },
  };
}

export async function getAllBrands() {
  return cached(cacheKeys.brands, 3600, async () => {
    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: true } },
      },
    });
    return brands
      .filter((b) => b._count.products > 0)
      .map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        productCount: b._count.products,
      }));
  });
}

// ---------------------------------------------------------------
// Product detail
// ---------------------------------------------------------------

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { name: true, slug: true } },
        },
      },
      brand: { select: { name: true, slug: true } },
      images: { orderBy: { position: "asc" } },
      reviews: {
        where: { approved: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true, image: true } },
        },
      },
    },
  });

  if (!product) return null;

  return {
    ...product,
    price: toNumber(product.price),
    compareAtPrice: product.compareAtPrice
      ? toNumber(product.compareAtPrice)
      : null,
    costPrice: null, // never expose margin to the storefront
    features: (product.features as string[] | null) ?? [],
    specs: (product.specs as Record<string, string> | null) ?? {},
  };
}

/** Same category first, then anything else — always returns `limit` items. */
export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 4,
): Promise<ProductCardData[]> {
  return cached(cacheKeys.productRelated(productId), 900, async () => {
    const sameCategory = await prisma.product.findMany({
      where: { isActive: true, categoryId, id: { not: productId } },
      orderBy: [{ isBestseller: "desc" }, { ratingAvg: "desc" }],
      take: limit,
      select: productCardSelect,
    });

    if (sameCategory.length >= limit) return sameCategory.map(toProductCard);

    const filler = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: { not: categoryId },
        id: { not: productId },
      },
      orderBy: { ratingAvg: "desc" },
      take: limit - sameCategory.length,
      select: productCardSelect,
    });

    return [...sameCategory, ...filler].map(toProductCard);
  });
}

/** Slugs for generateStaticParams + sitemap. */
export async function getAllProductSlugs() {
  return cached(cacheKeys.sitemapProducts, 3600, () =>
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  );
}

export interface MerchantFeedProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  tagline: string | null;
  description: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  brandName: string | null;
  categoryName: string;
  categorySlug: string;
  parentCategoryName: string | null;
  parentCategorySlug: string | null;
  /** Ordered gallery. The first is the one Google shows. */
  images: string[];
}

/**
 * Every product Google Merchant Center should see.
 *
 * Out-of-stock items are included rather than filtered — the feed carries an
 * `availability` attribute for exactly this, and dropping an item makes
 * Merchant Center treat it as withdrawn, which resets the review it has already
 * passed. It comes back as a new item needing approval again when stock
 * returns.
 *
 * Inactive products *are* excluded: `isActive: false` means the storefront
 * won't serve the page, and a feed item whose landing page 404s is a
 * disapproval.
 */
export async function getMerchantFeedProducts(): Promise<
  MerchantFeedProduct[]
> {
  return cached(cacheKeys.merchantFeed, 3600, async () => {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        tagline: true,
        description: true,
        price: true,
        compareAtPrice: true,
        stock: true,
        brand: { select: { name: true } },
        category: {
          select: {
            name: true,
            slug: true,
            parent: { select: { name: true, slug: true } },
          },
        },
        images: { select: { url: true }, orderBy: { position: "asc" } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      tagline: row.tagline,
      description: row.description,
      price: toNumber(row.price),
      compareAtPrice:
        row.compareAtPrice === null ? null : toNumber(row.compareAtPrice),
      stock: row.stock,
      brandName: row.brand?.name ?? null,
      categoryName: row.category.name,
      categorySlug: row.category.slug,
      parentCategoryName: row.category.parent?.name ?? null,
      parentCategorySlug: row.category.parent?.slug ?? null,
      images: row.images.map((image) => image.url),
    }));
  });
}

// ---------------------------------------------------------------
// Search (header dropdown)
// ---------------------------------------------------------------

/**
 * The threshold, the shapes and the term normalisation live in `@/lib/search`,
 * because the browser needs them too and this module is server-only.
 */
const searchSuggestionSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  category: { select: { name: true } },
  images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
} satisfies Prisma.ProductSelect;

type SearchSuggestionRow = Prisma.ProductGetPayload<{
  select: typeof searchSuggestionSelect;
}>;

function toSuggestion(row: SearchSuggestionRow): SearchSuggestion {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: toNumber(row.price),
    compareAtPrice: row.compareAtPrice ? toNumber(row.compareAtPrice) : null,
    image: row.images[0]?.url ?? null,
    categoryName: row.category.name,
    inStock: row.stock > 0,
  };
}

/**
 * Suggestions for the dropdown.
 *
 * Cached for five minutes per normalised term: the same handful of words —
 * "lock", "camera", "alarm" — are what almost everyone types, so in practice the
 * database sees each popular search once per window no matter how many people
 * run it.
 */
export async function getSearchSuggestions(
  rawTerm: string,
): Promise<SearchSuggestion[]> {
  const term = normaliseSearchTerm(rawTerm);
  if (term.length < SEARCH_MIN_LENGTH) return [];

  return cached(cacheKeys.searchTerm(term), 300, async () => {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { tagline: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { category: { name: { contains: term, mode: "insensitive" } } },
          { brand: { name: { contains: term, mode: "insensitive" } } },
        ],
      },
      // In-stock first: a dropdown that leads with something unbuyable wastes
      // the click. Then the products the shop already knows sell.
      orderBy: [
        { stock: "desc" },
        { isBestseller: "desc" },
        { ratingCount: "desc" },
      ],
      take: SEARCH_SUGGESTION_LIMIT,
      select: searchSuggestionSelect,
    });

    return rows.map(toSuggestion);
  });
}

/**
 * What the dropdown shows before anything is typed.
 *
 * Cached for half an hour and identical for every visitor, so opening the search
 * box is free — the panel is never empty, and idling in it costs nothing.
 */
export async function getSearchLanding(): Promise<SearchLanding> {
  return cached(cacheKeys.searchLanding, 1800, async () => {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, isBestseller: true, stock: { gt: 0 } },
        orderBy: [{ ratingCount: "desc" }, { ratingAvg: "desc" }],
        take: SEARCH_SUGGESTION_LIMIT,
        select: searchSuggestionSelect,
      }),
      prisma.category.findMany({
        where: { parentId: { not: null }, featured: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        take: 6,
        select: { name: true, slug: true },
      }),
    ]);

    return { products: products.map(toSuggestion), categories };
  });
}
