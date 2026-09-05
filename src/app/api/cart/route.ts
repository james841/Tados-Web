import { z } from "zod";

import { handleRoute, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

/**
 * POST /api/cart — current details for the products in a visitor's cart.
 *
 * The cart lives in localStorage and stores a snapshot of each product: name,
 * price, image, stock, slug. That snapshot is never refreshed, so a product
 * renamed or repriced in the admin panel keeps its old details in every cart
 * that already held it — indefinitely, since a cart persists across visits.
 * The most visible symptom is a name: rename a product and the bag still shows
 * what it used to be called.
 *
 * Public on purpose. Everything returned is already on the product page, and
 * the input is a list of IDs the visitor is holding anyway. It is capped at the
 * cart's practical size so a hand-made request can't ask for the catalogue, and
 * IDs are de-duplicated before the query.
 *
 * This does not make the cart authoritative — checkout still re-reads prices
 * and stock server-side before charging anything. It only stops the shopper
 * being shown details we know to be out of date.
 */

export const runtime = "nodejs";

const bodySchema = z.object({
  productIds: z.array(z.string().min(1)).max(50),
});

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { productIds } = await parseBody(request, bodySchema);
    const ids = [...new Set(productIds)];

    if (ids.length === 0) {
      return jsonOk({ products: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        sku: true,
        price: true,
        stock: true,
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    });

    return jsonOk(
      {
        products: products.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          sku: product.sku,
          price: toNumber(product.price),
          stock: product.stock,
          image: product.images[0]?.url ?? null,
        })),
      },
      {
        // Per-visitor and about their own cart — never cache it anywhere.
        headers: { "Cache-Control": "no-store" },
      },
    );
  });
}
