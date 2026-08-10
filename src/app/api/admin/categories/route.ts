import {
  handleRoute,
  jsonOk,
  parseBody,
  requireAdmin,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogueCache } from "@/lib/redis";
import { categoryCreateSchema } from "@/lib/validators";

/**
 * /api/admin/categories — list and create.
 *
 * Deliberately unpaginated: the taxonomy is a couple of dozen rows, the product
 * form needs every option at once for its <select>, and the management page
 * needs the whole tree to render the hierarchy. Child categories carry their
 * parent name in `label`, so two similarly-named children stay distinguishable
 * in a plain <select>.
 */
export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();

    const [categories, brands] = await Promise.all([
      prisma.category.findMany({
        orderBy: [{ position: "asc" }, { name: "asc" }],
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
          parent: { select: { name: true } },
          _count: { select: { products: true, children: true } },
        },
      }),
      prisma.brand.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    return jsonOk({
      categories: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        image: category.image,
        icon: category.icon,
        position: category.position,
        featured: category.featured,
        parentId: category.parentId,
        parentName: category.parent?.name ?? null,
        label: category.parent
          ? `${category.parent.name} → ${category.name}`
          : category.name,
        productCount: category._count.products,
        childCount: category._count.children,
      })),
      brands,
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();

    const data = await parseBody(request, categoryCreateSchema);

    const category = await prisma.category.create({
      data,
      select: { id: true, name: true, slug: true },
    });

    // The header, footer and homepage rail all read cached category data.
    await invalidateCatalogueCache();

    return jsonOk(category, { status: 201 });
  });
}
