import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { invalidateCatalogueCache } from "../src/lib/redis";

/**
 * One-time migration: the client's photo folder → Supabase Storage.
 *
 * The seed points every product at `/products/<name>.jpg`, but those files were
 * never in the repo — only `hero-smart-home.jpg` is. The real photography sits
 * in `public/Web Photos-…/`, unoptimised and with spaces in the filenames, so it
 * can't be served as-is either. This uploads it to the bucket and rewrites the
 * database rows to the resulting CDN URLs.
 *
 * Two things happen here:
 *
 *  1. Product galleries. Each entry in MAPPING below is a hand-written match
 *     from a photo to the product it shows, in the order it should appear.
 *  2. Category tiles. No photo in the folder is a category tile, and the seeded
 *     `/products/cat-*.jpg` paths 404 on every page load. Those are nulled so
 *     the storefront falls back to the lucide icon it already renders when
 *     `image` is empty — quiet and correct until an admin uploads a real tile.
 *
 * Idempotent: a product whose images already live in the bucket is skipped, so
 * re-running after a partial failure only does the outstanding work.
 *
 *   npx tsx prisma/migrate-photos-to-storage.ts
 *   npx tsx prisma/migrate-photos-to-storage.ts --dry-run
 *
 * Deliberately not wired into `npm run db:seed`. It's a one-off against real
 * data, and a stray `npm run` shouldn't re-upload 15 MB.
 */

const DRY_RUN = process.argv.includes("--dry-run");

const PHOTO_ROOT = path.join(
  process.cwd(),
  "public",
  "Web Photos-20260804T004405Z-1-001",
  "Web Photos",
);

/** Long-edge ceiling and quality, matched to `src/lib/image-compress.ts`. */
const MAX_EDGE = 1600;
const QUALITY = 82;

/**
 * Photo → product, in gallery order. First entry becomes the card thumbnail.
 *
 * Written by hand: the filenames name the product but not which variant, and
 * `IMGP6677.JPG` names nothing at all. Guessing would put a door lock on a
 * ceiling speaker, so anything ambiguous is left out and listed at the end of
 * the run for you to place from the admin UI.
 */
const MAPPING: Record<string, string[]> = {
  "smart-3d-facial-recognition-door-lock": [
    "Smart 3D Facial Recognition Door Lock.png",
    "Smart 3D Facial Recognition Door Lock 2.JPG",
    "Smart 3D Facial Recognition Door Lock 3.JPG",
  ],
  "smart-u-lock-gps-tracking": ["Smart U-Locks.png"],
  "smart-jam-lock-gates-doors": ["Smart JAM Lock - back.png"],
  "fingerprint-smart-door-lock": ["Fingerprint Smart Door Lock.png"],
  "smart-security-alarm-system-kit": [
    "Smart Security Alarm System.png",
    "Smart Security Alarm System 2.JPG",
  ],
  "smart-fingerprint-padlock": [
    "Smart Fingerprint Padlock.JPG",
    "Smart Fingerprint Padlock 1.JPG",
  ],
  "smart-wifi-bluetooth-ceiling-speakers": [
    "Smart Wifi_Bluetooth Ceiling Speakers.png",
  ],
  // One photo shows both switches. Same source, two products — the bucket ends
  // up with two objects, which is the right trade for independent galleries.
  "smart-wifi-switch": ["Smart Wifi and Zigbee Switches.JPG"],
  "smart-zigbee-switch": ["Smart Wifi and Zigbee Switches 2.JPG"],
  "smart-smoke-detector": ["Smart Smoke Detector.png"],
};

const prisma = new PrismaClient();

function env(name: string, fallback?: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

const SUPABASE_URL = (
  env("SUPABASE_URL") ??
  env("NEXT_PUBLIC_SUPABASE_URL") ??
  ""
).replace(/\/+$/, "");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/**
 * The bucket *name*, not a URL — mirroring the guard in `src/lib/storage.ts`.
 * Pasting the S3 endpoint the dashboard shows produces a "Bucket not found"
 * 404 that gives no hint about the real cause.
 */
const BUCKET = (() => {
  const configured = env("SUPABASE_STORAGE_BUCKET") ?? "media";

  if (configured.includes("/") || configured.includes(":")) {
    const recovered = configured.replace(/\/+$/, "").split("/").pop() ?? "";
    console.warn(
      `[storage] SUPABASE_STORAGE_BUCKET looks like a URL. Using "${recovered}" — set it to the bucket name alone.\n`,
    );
    return recovered;
  }

  return configured;
})();

function publicUrl(objectPath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

/** `Smart U-Locks.png` -> `smart-u-locks` */
function slugifyFilename(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image"
  );
}

/**
 * Resize and re-encode to WebP.
 *
 * Same 1600px / q82 target the browser uploader hits, so a photo migrated here
 * and one uploaded from the admin later are indistinguishable on the storefront.
 * `sharp` ships with Next, so this needs no extra dependency.
 */
async function compress(absolutePath: string) {
  const { default: sharp } = await import("sharp");

  return sharp(absolutePath)
    // EXIF orientation, or portrait phone photos come out on their side.
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY })
    .toBuffer();
}

async function upload(objectPath: string, body: Buffer) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        // Re-running after a partial failure should overwrite, not 409.
        "x-upsert": "true",
      },
      body: new Uint8Array(body),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${detail.slice(0, 200)}`);
  }

  return publicUrl(objectPath);
}

async function migrateProducts() {
  const unreadable: string[] = [];
  let uploaded = 0;
  let skipped = 0;

  for (const [slug, filenames] of Object.entries(MAPPING)) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, name: true, images: { select: { url: true } } },
    });

    if (!product) {
      console.log(`  ? no product with slug "${slug}" — skipped`);
      continue;
    }

    // Idempotency: if this product's gallery is already in *this* bucket, the
    // migration ran before. Re-uploading would also clobber gallery edits an
    // admin has made since.
    //
    // Matching the full prefix rather than a loose "/storage/v1/object/" is
    // what makes a bucket change recoverable. A row pointing at a bucket that
    // no longer exists is a dead URL, not a completed migration — the loose
    // check counted it as done and skipped the re-upload silently.
    const bucketPrefix = publicUrl("");
    const alreadyMigrated =
      product.images.length > 0 &&
      product.images.every((image) => image.url.startsWith(bucketPrefix));

    if (alreadyMigrated) {
      skipped += 1;
      console.log(`  = ${product.name} — already in the bucket`);
      continue;
    }

    const urls: string[] = [];

    for (const filename of filenames) {
      const absolutePath = path.join(PHOTO_ROOT, filename);

      if (!existsSync(absolutePath)) {
        unreadable.push(filename);
        continue;
      }

      const original = await readFile(absolutePath);
      const optimised = await compress(absolutePath);
      const objectPath = `products/${slugifyFilename(filename)}.webp`;

      const before = Math.round(original.byteLength / 1024);
      const after = Math.round(optimised.byteLength / 1024);

      if (DRY_RUN) {
        console.log(`  · ${filename} → ${objectPath} (${before}KB → ${after}KB)`);
        urls.push(publicUrl(objectPath));
        continue;
      }

      urls.push(await upload(objectPath, optimised));
      uploaded += 1;
      console.log(`  ↑ ${filename} → ${objectPath} (${before}KB → ${after}KB)`);
    }

    if (urls.length === 0) continue;

    if (!DRY_RUN) {
      // Replace rather than append: the existing rows point at files that were
      // never in the repo, so keeping them would keep the 404s.
      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId: product.id } }),
        prisma.productImage.createMany({
          data: urls.map((url, position) => ({
            productId: product.id,
            url,
            alt: product.name,
            position,
          })),
        }),
      ]);
    }

    console.log(`  ✓ ${product.name} — ${urls.length} image(s)`);
  }

  return { uploaded, skipped, unreadable };
}

/**
 * Drop seeded product image rows whose files were never in the repo.
 *
 * Same class of breakage as the category tiles below, but it survives the
 * mapping pass: a product nobody had a photo for keeps its `/products/*.jpg`
 * rows, and every card and gallery slot renders a broken image. The card
 * already handles an empty gallery with "Image coming soon", which is the
 * honest state until someone uploads the real photo.
 *
 * Only rows pointing at a missing local file are touched — bucket URLs and
 * anything actually on disk are left alone.
 */
async function clearMissingProductImages() {
  const local = await prisma.productImage.findMany({
    where: { url: { startsWith: "/" } },
    select: { id: true, url: true, product: { select: { name: true } } },
  });

  const missing = local.filter(
    (image) => !existsSync(path.join(process.cwd(), "public", image.url)),
  );

  if (missing.length === 0) {
    console.log("  = no broken product images");
    return 0;
  }

  if (!DRY_RUN) {
    await prisma.productImage.deleteMany({
      where: { id: { in: missing.map((image) => image.id) } },
    });
  }

  for (const image of missing) {
    console.log(`  × ${image.product.name} — ${image.url} (file not found)`);
  }

  return missing.length;
}

/**
 * Clear the seeded `/products/cat-*.jpg` paths.
 *
 * Those files don't exist, so every homepage render logs a 404 and next/image
 * throws "received null". Setting `image` to null makes the carousel and the
 * admin table fall back to the category icon, which they already handle.
 */
async function clearMissingCategoryImages() {
  const stale = await prisma.category.findMany({
    where: { image: { startsWith: "/products/" } },
    select: { id: true, name: true, image: true },
  });

  const missing = stale.filter(
    (category) =>
      !existsSync(path.join(process.cwd(), "public", category.image as string)),
  );

  if (missing.length === 0) {
    console.log("  = no broken category images");
    return 0;
  }

  if (!DRY_RUN) {
    await prisma.category.updateMany({
      where: { id: { in: missing.map((c) => c.id) } },
      data: { image: null },
    });
  }

  for (const category of missing) {
    console.log(`  × ${category.name} — ${category.image} (file not found)`);
  }

  return missing.length;
}

/**
 * Fail before uploading, not after, when the bucket name is wrong.
 *
 * Supabase bucket names are case-sensitive and a miss returns
 * `{"error":"Bucket not found"}` — accurate but useless when the real cause is
 * `Media` vs `media`. Listing the buckets first lets this say which names do
 * exist. Also catches a non-public bucket, which uploads fine and then serves
 * 400 on every read.
 */
async function assertBucketUsable() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  });

  if (!res.ok) {
    throw new Error(
      `Could not list buckets (${res.status}). Check SUPABASE_SERVICE_ROLE_KEY.`,
    );
  }

  const buckets = (await res.json()) as { name: string; public: boolean }[];
  const match = buckets.find((b) => b.name === BUCKET);

  if (!match) {
    throw new Error(
      `No bucket named "${BUCKET}". Names are case-sensitive.\n` +
        `  Buckets in this project: ${buckets.map((b) => `"${b.name}"`).join(", ") || "(none)"}\n` +
        `  Set SUPABASE_STORAGE_BUCKET in .env to the bucket name alone — not the S3 endpoint URL.`,
    );
  }

  if (!match.public) {
    throw new Error(
      `Bucket "${BUCKET}" is private. Uploads would succeed but every image URL would 400.\n` +
        `  Supabase dashboard → Storage → ${BUCKET} → Settings → make it a public bucket.`,
    );
  }
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env before running this.",
    );
  }

  if (!existsSync(PHOTO_ROOT)) {
    throw new Error(`Photo folder not found:\n  ${PHOTO_ROOT}`);
  }

  await assertBucketUsable();

  console.log(
    DRY_RUN
      ? "DRY RUN — nothing will be uploaded or written.\n"
      : `Uploading to ${SUPABASE_URL}/storage/v1 (bucket: ${BUCKET})\n`,
  );

  console.log("Products:");
  const { uploaded, skipped, unreadable } = await migrateProducts();

  console.log("\nOrphaned product images:");
  const droppedImages = await clearMissingProductImages();

  console.log("\nCategory tiles:");
  const cleared = await clearMissingCategoryImages();

  console.log(
    `\nDone. ${uploaded} uploaded, ${skipped} product(s) already migrated, ` +
      `${droppedImages} dead image row(s) dropped, ${cleared} category image(s) cleared.`,
  );

  if (!DRY_RUN && (uploaded > 0 || droppedImages > 0 || cleared > 0)) {
    await invalidateCatalogueCache();
    console.log(
      "\nCatalogue cache invalidated." +
        "\n  Note: with no REDIS_URL set, the cache is a per-process Map — this" +
        "\n  process cleared its own, not the dev server's. Restart `npm run dev`" +
        "\n  (or wait out the 1h TTL) to see the change. Once REDIS_URL points at" +
        "\n  Upstash the cache is shared and this becomes immediate.",
    );
  }

  if (unreadable.length > 0) {
    console.log("\nListed in the mapping but not on disk:");
    for (const name of unreadable) console.log(`  · ${name}`);
  }

  console.log(
    "\nNot migrated (no confident match — upload these from the admin UI):" +
      "\n  · Addition Photos/IMGP*.JPG (11 files)" +
      "\n  · New Photo Addition/*.JPG and IMG_943*.PNG (8 files)" +
      "\n  · 3a171ee1-….JPG, 444f6214-….JPG, Smart Edit.png" +
      "\n  · every category tile — there's no category photography in the folder",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
