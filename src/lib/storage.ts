import "server-only";

/**
 * Supabase Storage, over the REST API.
 *
 * Deliberately dependency-free. `@supabase/supabase-js` bundles auth, realtime
 * and postgrest for what amounts to three HTTP calls here, and Prisma already
 * owns database access — so this talks to the Storage endpoints directly.
 *
 * The service-role key bypasses row-level security, so this module is
 * `server-only`: importing it from a client component is a build error rather
 * than a leaked key.
 */

/**
 * The bucket *name*, not a URL.
 *
 * Supabase's dashboard shows an S3 endpoint next to the bucket, and pasting
 * that produces `…/object/https://…/s3/Media/products/x.webp` — a 404 whose
 * message ("Bucket not found") doesn't hint at the real cause. Rejecting a
 * URL-shaped value here turns that into something you can act on.
 */
const DEFAULT_BUCKET = "media";

/**
 * Path segments that appear in Supabase's own URLs and are therefore never a
 * bucket name. `…/storage/v1/s3/Media` ends in the bucket, but the shorter
 * `…storage.supabase.co/storage` ends in "storage" — recovering that blindly
 * swaps one wrong value for another, so those words fall back to the default.
 */
const NOT_BUCKET_NAMES = new Set([
  "storage",
  "s3",
  "v1",
  "object",
  "public",
  "upload",
  "sign",
]);

const BUCKET = (() => {
  const configured = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!configured) return DEFAULT_BUCKET;

  if (!configured.includes("/") && !configured.includes(":")) return configured;

  const recovered = configured.replace(/\/+$/, "").split("/").pop() ?? "";

  if (!recovered || NOT_BUCKET_NAMES.has(recovered.toLowerCase())) {
    console.warn(
      `[storage] SUPABASE_STORAGE_BUCKET is a URL with no bucket name in it. Falling back to "${DEFAULT_BUCKET}" — set it to the bucket name alone.`,
    );
    return DEFAULT_BUCKET;
  }

  console.warn(
    `[storage] SUPABASE_STORAGE_BUCKET looks like a URL. Using "${recovered}" — set it to the bucket name alone.`,
  );
  return recovered;
})();

/** Exposed so an error message can name the bucket it actually tried. */
export function bucketName() {
  return BUCKET;
}

/** Trailing slashes would produce `//storage` URLs that 404. */
function projectUrl() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.replace(/\/+$/, "");
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

/**
 * Whether uploads can work at all.
 *
 * Checked before every upload so a missing env var produces one clear message
 * instead of an opaque 401 from Supabase.
 */
export function isStorageConfigured() {
  return Boolean(projectUrl() && serviceKey());
}

/** The CDN-backed URL for a public object. */
export function publicUrl(path: string) {
  return `${projectUrl()}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * A collision-proof object path.
 *
 * Two admins uploading `photo.jpg` a second apart must not overwrite each
 * other, so the random suffix is what guarantees uniqueness — the slugified
 * original name is kept only to make the bucket browsable by a human.
 */
export function buildObjectPath(
  folder: string,
  originalName: string,
  extension: string,
) {
  const stem =
    originalName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";

  const unique = crypto.randomUUID().slice(0, 8);

  return `${folder}/${stem}-${unique}.${extension}`;
}

export async function uploadToStorage(
  path: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string,
) {
  const res = await fetch(
    `${projectUrl()}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey()}`,
        "Content-Type": contentType,
        // Long TTL is safe: paths are unique, so an object is never replaced.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: body as BodyInit,
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");

    // Supabase answers a missing bucket with 400 + `"Bucket not found"`, which
    // says nothing about *which* name was tried or what exists. The usual cause
    // is SUPABASE_STORAGE_BUCKET holding the S3 endpoint URL the dashboard
    // shows, or a case mismatch — bucket names are case-sensitive.
    if (detail.includes("NoSuchBucket") || detail.includes("Bucket not found")) {
      throw new Error(
        `No storage bucket named "${BUCKET}". ${await describeBuckets()}`,
      );
    }

    throw new Error(
      `Storage upload failed (${res.status}). ${detail.slice(0, 200)}`,
    );
  }

  return publicUrl(path);
}

/**
 * List the buckets that do exist, for an error message worth reading.
 *
 * Only called on the failure path, so it costs nothing in normal operation.
 * Any problem listing is swallowed — this exists to explain another error, and
 * must never replace it with one of its own.
 */
async function describeBuckets() {
  try {
    const res = await fetch(`${projectUrl()}/storage/v1/bucket`, {
      headers: { Authorization: `Bearer ${serviceKey()}` },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) return "Set SUPABASE_STORAGE_BUCKET to the bucket name alone.";

    const buckets = (await res.json()) as { name: string; public: boolean }[];

    if (!Array.isArray(buckets) || buckets.length === 0) {
      return "This project has no buckets yet — create one in Supabase → Storage.";
    }

    return `Buckets in this project: ${buckets
      .map((b) => `${b.name}${b.public ? "" : " (private)"}`)
      .join(", ")}. Names are case-sensitive.`;
  } catch {
    return "Set SUPABASE_STORAGE_BUCKET to the bucket name alone.";
  }
}

/**
 * Best-effort delete.
 *
 * Returns false rather than throwing: an orphaned object costs a few KB, while
 * a failed delete that blocks the surrounding save would lose the admin's edit.
 */
export async function deleteFromStorage(url: string) {
  const prefix = `${projectUrl()}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(prefix)) return false;

  const path = url.slice(prefix.length);

  try {
    const res = await fetch(
      `${projectUrl()}/storage/v1/object/${BUCKET}/${path}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${serviceKey()}` },
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
