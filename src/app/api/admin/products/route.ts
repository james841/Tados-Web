import type { Prisma } from "@prisma/client";

import {
  handleRoute,
  jsonOk,
  parseBody,
  readPagination,
  requireAdmin,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { assertSkuIsFree, resolveProductSlug } from "@/lib/product-identity";
import { invalidateCatalogueCache } from "@/lib/redis";
import { toNumber } from "@/lib/utils";
import { productCreateSchema } from "@/lib/validators";

/**
 * /api/admin/products — list and create.
 *
 * Decimal columns are converted to plain numbers before serialising: Prisma's
 * Decimal survives JSON.stringify as an object, which the client table would
 * render as "[object Object]".
 */

/** Shared shape so list and detail responses stay in step. */
const productSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  lowStockAt: true,
  isActive: true,
  isFeatured: true,
  isBestseller: true,
  isNewArrival: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    select: { url: true, alt: true },
    orderBy: { position: "asc" },
    take: 1,
  },
} satisfies Prisma.ProductSelect;

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const { page, perPage, skip, take } = readPagination(searchParams);

    const q = searchParams.get("q")?.trim();
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const status = searchParams.get("status"); // active | inactive | low
    const sort = searchParams.get("sort") ?? "newest";

    const where: Prisma.ProductWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
      // "Low stock" is relative to each product's own threshold, which a plain
      // `where` can't express — the raw column comparison does it in-database.
      ...(status === "low"
        ? { stock: { lte: prisma.product.fields.lowStockAt } }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price-asc"
        ? { price: "asc" }
        : sort === "price-desc"
          ? { price: "desc" }
          : sort === "stock"
            ? { stock: "asc" }
            : sort === "name"
              ? { name: "asc" }
              : { createdAt: "desc" };

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        select: productSelect,
      }),
      prisma.product.count({ where }),
    ]);

    return jsonOk({
      products: rows.map((p) => ({
        ...p,
        price: toNumber(p.price),
        compareAtPrice: p.compareAtPrice ? toNumber(p.compareAtPrice) : null,
        image: p.images[0]?.url ?? null,
      })),
      pagination: {
        page,
        perPage,
        total,
        pages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();

    const data = await parseBody(request, productCreateSchema);
    // `images` is optional on the inferred input type because the schema gives
    // it a default, so it needs a fallback here even though Zod fills it in.
    const { images = [], ...fields } = data;

    // Checked before the insert so the admin gets told which product holds the
    // SKU, rather than a bare constraint violation.
    await assertSkuIsFree(fields.sku);

    const product = await prisma.product.create({
      data: {
        ...fields,
        // Two products can legitimately share a name; they can't share a URL.
        // Disambiguated here instead of refusing the save.
        slug: await resolveProductSlug(fields.slug),
        // Position is derived from array order — the form reorders the array
        // rather than asking an admin to type index numbers.
        images: {
          create: images.map((image, position) => ({ ...image, position })),
        },
      },
      select: productSelect,
    });

    // Storefront reads are cached; a new product must appear immediately.
    await invalidateCatalogueCache();

    return jsonOk(
      { ...product, price: toNumber(product.price) },
      { status: 201 },
    );
  });
}
