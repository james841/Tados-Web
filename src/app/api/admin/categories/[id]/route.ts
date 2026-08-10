import {
  handleRoute,
  HttpError,
  jsonOk,
  parseBody,
  requireAdmin,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogueCache } from "@/lib/redis";
import { categoryUpdateSchema } from "@/lib/validators";

/**
 * /api/admin/categories/[id] — read, update, delete a single category.
 *
 * Deletes are hard, unlike products: nothing in order history references a
 * category, so there's no record to preserve. What there *is* is a self-
 * relation with `onDelete: SetNull`, which would quietly promote a deleted
 * parent's children to top level — the child guard below is what stops that
 * happening by accident.
 */

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        icon: true,
        position: true,
        featured: true,
        parentId: true,
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) throw new HttpError(404, "Category not found.");

    return jsonOk({
      ...category,
      productCount: category._count.products,
      childCount: category._count.children,
    });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;

    const data = await parseBody(request, categoryUpdateSchema);

    // Re-parenting can break the tree in three ways. The storefront renders
    // exactly two levels (header dropdown, footer, homepage rail), so anything
    // deeper would simply stop appearing rather than fail loudly.
    if (data.parentId) {
      if (data.parentId === id) {
        throw new HttpError(400, "A category can't be its own parent.");
      }

      const [parent, childCount] = await Promise.all([
        prisma.category.findUnique({
          where: { id: data.parentId },
          select: { id: true, name: true, parentId: true },
        }),
        prisma.category.count({ where: { parentId: id } }),
      ]);

      if (!parent) throw new HttpError(400, "That parent category no longer exists.");

      if (parent.parentId) {
        throw new HttpError(
          400,
          `“${parent.name}” is already a sub-category. Categories only nest two levels deep.`,
        );
      }

      if (childCount > 0) {
        throw new HttpError(
          409,
          `This category has ${childCount} sub-categor${childCount === 1 ? "y" : "ies"}, so it can't become a sub-category itself. Re-parent them first.`,
        );
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        featured: true,
        parentId: true,
      },
    });

    await invalidateCatalogueCache();

    return jsonOk(category);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) throw new HttpError(404, "Category not found.");

    const { products, children } = category._count;

    if (products > 0) {
      throw new HttpError(
        409,
        `${products} product${products === 1 ? " is" : "s are"} in this category. Move ${products === 1 ? "it" : "them"} to another category first.`,
      );
    }

    if (children > 0) {
      throw new HttpError(
        409,
        `This category has ${children} sub-categor${children === 1 ? "y" : "ies"}. Delete or re-parent ${children === 1 ? "it" : "them"} first.`,
      );
    }

    await prisma.category.delete({ where: { id } });
    await invalidateCatalogueCache();

    return jsonOk({ id, deleted: true });
  });
}
