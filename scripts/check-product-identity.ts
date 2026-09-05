/**
 * Checks the name/SKU/slug rules the admin form relies on.
 *
 *   npx tsx --env-file=.env scripts/check-product-identity.mts
 *
 * No writes — reads the catalogue to prove slug disambiguation picks a free
 * value, and runs the validator over names and SKUs that used to be refused.
 */

import { productCreateSchema } from "../src/lib/validators";
import { slugify } from "../src/lib/utils";
import { resolveProductSlug } from "../src/lib/product-identity";
import { prisma } from "../src/lib/prisma";

const NAMES = [
  "Smart Lock (2-Pack) — 50% Off!",
  "Café Österreich Türschloss",
  "智能门锁",
  "Lock #7 @ R1,299 & more",
  "  Padded   Spaces  ",
];

const SKUS = [
  "TDS/LOCK-01",
  "SKU #7 (v2)",
  "ЛОК-42",
  "sku with spaces",
  "!!!___###",
];

function base(extra: Record<string, unknown>) {
  return {
    description: "d",
    price: "1",
    stock: "1",
    lowStockAt: "1",
    categoryId: "c",
    ...extra,
  };
}

async function main() {
  console.log("NAME -> slug (derived, before uniquifying)");
  for (const name of NAMES) {
    const parsed = productCreateSchema.safeParse(
      base({ name, slug: slugify(name) || "product", sku: "X" }),
    );
    console.log(
      `  ${parsed.success ? "ok  " : "FAIL"} ${JSON.stringify(name).padEnd(36)} -> ${
        parsed.success ? parsed.data.slug : JSON.stringify(parsed.error.flatten().fieldErrors)
      }`,
    );
  }

  console.log("\nSKU accepted?");
  for (const sku of SKUS) {
    const parsed = productCreateSchema.safeParse(
      base({ name: "N", slug: "n", sku }),
    );
    console.log(
      `  ${parsed.success ? "ok  " : "FAIL"} ${JSON.stringify(sku).padEnd(24)} ${
        parsed.success ? `-> ${JSON.stringify(parsed.data.sku)}` : JSON.stringify(parsed.error.flatten().fieldErrors)
      }`,
    );
  }

  console.log("\nSlug typed with punctuation is cleaned, not rejected");
  for (const typed of ["Smart Lock!!", "  UPPER Case  ", "a--b__c"]) {
    const parsed = productCreateSchema.safeParse(
      base({ name: "N", slug: typed, sku: "X" }),
    );
    console.log(
      `  ${parsed.success ? "ok  " : "FAIL"} ${JSON.stringify(typed).padEnd(20)} -> ${
        parsed.success ? parsed.data.slug : "rejected"
      }`,
    );
  }

  const existing = await prisma.product.findFirst({
    select: { slug: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const resolved = await resolveProductSlug(existing.slug);
    console.log(
      `\nDuplicate slug handling\n  "${existing.slug}" is taken by "${existing.name}"\n  a new product asking for it gets -> "${resolved}"`,
    );
    console.log(
      resolved === existing.slug
        ? "  FAIL — collision was not resolved"
        : "  ok — save proceeds instead of erroring",
    );

    const free = await resolveProductSlug(existing.slug, undefined);
    const selfEdit = await resolveProductSlug(existing.slug, (
      await prisma.product.findFirstOrThrow({
        where: { slug: existing.slug },
        select: { id: true },
      })
    ).id);
    console.log(
      `  re-saving that same product keeps its slug -> "${selfEdit}" ${
        selfEdit === existing.slug ? "ok" : "FAIL"
      } (new product would get "${free}")`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
