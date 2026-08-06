import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { cached, cacheKeys } from "@/lib/redis";
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

/** Leaf categories with imagery, for the home "Popular Categories" rail. */
export async function getFeaturedCategories() {
  return cached(cacheKeys.featuredCategories, 3600, async () => {
    const categories = await prisma.category.findMany({
      where: { parentId: { not: null } },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        icon: true,
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

// ---------------------------------------------------------------
// Search (used by the header autocomplete)
// ---------------------------------------------------------------

export async function searchProducts(term: string, limit = 6) {
  if (!term || term.trim().length < 2) return [];

  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { tagline: { contains: term, mode: "insensitive" } },
        { category: { name: { contains: term, mode: "insensitive" } } },
      ],
    },
    orderBy: [{ isBestseller: "desc" }, { ratingCount: "desc" }],
    take: limit,
    select: productCardSelect,
  });

  return rows.map(toProductCard);
}
