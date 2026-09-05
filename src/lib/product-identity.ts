import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * The two product columns the database insists are unique: `slug` and `sku`.
 *
 * They fail in opposite ways, so they are handled in opposite ways.
 *
 * The slug is machinery. An admin types a name, the form derives a slug, and
 * most of them never look at the field — so a collision surfaces as a save that
 * refuses over a value nobody chose. Here it is resolved silently instead:
 * "smart-door-lock" becomes "smart-door-lock-2" and the save goes through.
 *
 * The SKU is the opposite: it is a real-world identifier that ties a row to a
 * box on a shelf and to a supplier's invoice. Quietly changing one would put
 * the wrong code on a picking list, so a collision is reported — but reported
 * with the name of the product already holding it, because the usual cause is a
 * product that was "deleted" from the admin panel and is actually still there,
 * deactivated, keeping its SKU.
 */

/**
 * Return a slug nobody else is using, based on the one requested.
 *
 * One query, not one per attempt: every slug that could collide starts with the
 * requested one, so they all come back together and the suffix is chosen in
 * memory.
 */
export async function resolveProductSlug(requested: string, excludeId?: string) {
  const taken = await prisma.product.findMany({
    where: {
      slug: { startsWith: requested },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { slug: true },
  });

  if (taken.length === 0) return requested;

  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(requested)) return requested;

  // Bounded rather than `while (true)`: 500 products sharing one base name is
  // not a case worth looping forever over, and the database's own unique
  // constraint is still there as the final word.
  for (let suffix = 2; suffix <= 500; suffix += 1) {
    const candidate = `${requested}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }

  throw new HttpError(
    409,
    `Too many products already use the web address "${requested}". Give this one a different address.`,
    { slug: [`"${requested}" and its variations are all taken.`] },
  );
}

/**
 * Refuse the save if another product already owns this SKU, naming it.
 *
 * The extra read costs one indexed lookup on a route an admin hits by hand a
 * few times a day. What it buys is the difference between "That sku is already
 * taken" and a message that says which product has it and what to do about it.
 */
export async function assertSkuIsFree(sku: string, excludeId?: string) {
  const clash = await prisma.product.findFirst({
    where: {
      sku,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { name: true, isActive: true },
  });

  if (!clash) return;

  const detail = clash.isActive
    ? `SKU "${sku}" already belongs to "${clash.name}".`
    : `SKU "${sku}" already belongs to "${clash.name}", which is deactivated rather than deleted — deactivated products keep their SKU. Reactivate that product or use a different code here.`;

  throw new HttpError(409, detail, { sku: [detail] });
}
