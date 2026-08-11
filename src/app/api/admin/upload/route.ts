import {
  handleRoute,
  HttpError,
  jsonOk,
  requireAdmin,
} from "@/lib/api";
import { ACCEPTED_IMAGE_TYPES, MAX_SOURCE_BYTES } from "@/lib/image-compress";
import {
  buildObjectPath,
  isStorageConfigured,
  publicUrl,
  uploadToStorage,
} from "@/lib/storage";

/**
 * POST /api/admin/upload?folder=products
 *
 * Single-file multipart upload, returning `{ url }` — the public Supabase
 * Storage URL that then gets stored in the DB by whichever form triggered it.
 *
 * The browser compresses before sending (see src/lib/image-compress.ts), so the
 * bytes arriving here are already web-sized. The limits are re-checked anyway:
 * a hand-crafted request would otherwise put a 40 MB original in the bucket and
 * every storefront visitor would pay for it.
 *
 * No DB access at all, so uploading a gallery can't contend with catalogue
 * reads — the URLs are persisted later, in one save, by the form.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();

    if (!isStorageConfigured()) {
      throw new HttpError(
        503,
        "Image storage isn't configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then restart.",
      );
    }

    // Folders keep the bucket browsable and are never user-visible, so an
    // allow-listed shape is enough — and it stops `../` path traversal.
    const folder = new URL(request.url).searchParams.get("folder") ?? "";
    if (!/^[a-z0-9-]{1,40}$/.test(folder)) {
      throw new HttpError(400, "A folder name like `products` is required.");
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");

    if (!(file instanceof File)) {
      throw new HttpError(400, "Expected a multipart form with a `file` field.");
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      throw new HttpError(
        415,
        `${file.type || "That file type"} isn't supported. Use JPEG, PNG, WebP or AVIF.`,
      );
    }

    if (file.size > MAX_SOURCE_BYTES) {
      throw new HttpError(413, "Images must be under 25 MB.");
    }

    const extension = file.type.replace("image/", "").replace("jpeg", "jpg");
    const path = buildObjectPath(folder, file.name, extension);

    await uploadToStorage(path, await file.arrayBuffer(), file.type);

    return jsonOk({ url: publicUrl(path) }, { status: 201 });
  });
}
