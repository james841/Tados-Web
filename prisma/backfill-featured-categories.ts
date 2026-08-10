import { PrismaClient } from "@prisma/client";

/**
 * One-time backfill: seed the "Show on homepage" flag.
 *
 * The homepage rail used to derive itself — every sub-category that had at
 * least one product got a tile. It's now driven by `Category.featured`, which
 * an admin toggles per category. Older databases only ever had `featured` set
 * on *parent* categories (see `seedCategories()`), so without this the rail
 * would come up empty on first deploy.
 *
 * This sets the flag on exactly the sub-categories that were visible under the
 * old rule, so the homepage looks identical before and after.
 *
 * Safe to run more than once, and safe on a database an admin has already
 * curated: it only ever turns the flag *on*, and only for rows where it is
 * currently off, so a deliberately-hidden category stays hidden.
 *
 *   npx tsx prisma/backfill-featured-categories.ts
 */

const prisma = new PrismaClient();

async function main() {
  const alreadyOn = await prisma.category.count({
    where: { parentId: { not: null }, featured: true },
  });

  if (alreadyOn > 0) {
    console.log(
      `${alreadyOn} sub-categor${alreadyOn === 1 ? "y is" : "ies are"} already on the homepage — nothing to backfill.`,
    );
    return;
  }

  const candidates = await prisma.category.findMany({
    where: {
      parentId: { not: null },
      featured: false,
      products: { some: {} },
    },
    select: { id: true, name: true },
  });

  if (candidates.length === 0) {
    console.log("No sub-categories with products found — nothing to backfill.");
    return;
  }

  const { count } = await prisma.category.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { featured: true },
  });

  console.log(`Put ${count} categor${count === 1 ? "y" : "ies"} on the homepage:`);
  for (const category of candidates) console.log(`  · ${category.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
