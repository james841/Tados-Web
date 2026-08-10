import { handleRoute, jsonOk, parseBody, requireAdmin, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogueCache } from "@/lib/redis";
import { toNumber } from "@/lib/utils";
import { productUpdateSchema } from "@/lib/validators";

/**
 * /api/admin/products/[id] — read, update, delete a single product.
 *
 * Deletes are soft by default. An order's line items reference the product row
 * (`OrderItem.productId` is a required relation), so a hard delete would either
 * fail or orphan order history — deactivating keeps the record intact while
 * removing it from the storefront. `?hard=true` is available for products that
 * have never been ordered, and is refused otherwise.
 */

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: { orderBy: { position: "asc" } },
      },
    });

    if (!product) throw new HttpError(404, "Product not found.");

    return jsonOk({
      ...product,
      price: toNumber(product.price),
      compareAtPrice: product.compareAtPrice
        ? toNumber(product.compareAtPrice)
        : null,
      costPrice: product.costPrice ? toNumber(product.costPrice) : null,
    });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;

    const data = await parseBody(request, productUpdateSchema);
    const { images, ...fields } = data;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...fields,
        // Only touch the gallery when the client actually sent one. Replacing
        // wholesale is simpler than diffing and keeps `position` contiguous.
        ...(images
          ? {
              images: {
                deleteMany: {},
                create: images.map((image, position) => ({
                  ...image,
                  position,
                })),
              },
            }
          : {}),
      },
      include: { images: { orderBy: { position: "asc" } } },
    });

    await invalidateCatalogueCache();

    return jsonOk({ ...product, price: toNumber(product.price) });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;

    const hard = new URL(request.url).searchParams.get("hard") === "true";

    if (hard) {
      const orderedCount = await prisma.orderItem.count({
        where: { productId: id },
      });

      if (orderedCount > 0) {
        throw new HttpError(
          409,
          "This product appears on existing orders and cannot be permanently deleted. Deactivate it instead.",
        );
      }

      await prisma.product.delete({ where: { id } });
      await invalidateCatalogueCache();

      return jsonOk({ id, deleted: true });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });

    await invalidateCatalogueCache();

    return jsonOk({ ...product, deleted: false });
  });
}
