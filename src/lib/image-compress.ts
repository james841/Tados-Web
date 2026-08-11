/**
 * Browser-side image compression.
 *
 * Runs before the upload, not after, which is the whole point: a 6 MB phone
 * photo becomes ~250 KB before it leaves the device. That saves the admin's
 * mobile data, keeps the request well inside serverless body limits, and means
 * the bucket only ever holds web-sized originals — so `next/image` has less to
 * fetch and re-encode on the storefront.
 *
 * WebP where supported, JPEG otherwise. Transparency is preserved by keeping
 * PNG sources as PNG only when they actually have transparent pixels, since
 * flattening a transparent logo onto black is worse than a larger file.
 */

/** Long-edge ceiling. `deviceSizes` in next.config tops out at 1920. */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export interface CompressedImage {
  blob: Blob;
  extension: string;
  width: number;
  height: number;
  /** For an instant preview — caller must revokeObjectURL when done. */
  previewUrl: string;
  originalBytes: number;
  compressedBytes: number;
}

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];

/** 25 MB — generous for a raw phone photo, but rejects a video by mistake. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

let webpSupport: boolean | null = null;

function supportsWebP() {
  if (webpSupport !== null) return webpSupport;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupport;
}

/**
 * `createImageBitmap` handles EXIF rotation natively, so a photo taken in
 * portrait doesn't come out sideways. Safari <15 lacks the options argument, so
 * an `<img>` decode is the fallback — modern iOS applies EXIF there too.
 */
async function decode(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through — HEIC on a browser without a decoder lands here.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error("That file isn't an image this browser can read."));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function hasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  // Sampling every 16th pixel: fast, and a transparent region large enough to
  // matter visually will always contain at least one sampled pixel.
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 64) {
    if (data[i] < 250) return true;
  }
  return false;
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(
      `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 25 MB.`,
    );
  }

  const source = await decode(file);
  const sourceWidth = source.width;
  const sourceHeight = source.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error(`Could not read the dimensions of ${file.name}.`);
  }

  // Only ever scale down. Upscaling a small image adds bytes and no detail.
  const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("This browser can't process images.");

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  if ("close" in source) source.close();

  const keepAlpha =
    (file.type === "image/png" || file.type === "image/webp") &&
    hasTransparency(ctx, width, height);

  const mime = keepAlpha
    ? "image/png"
    : supportsWebP()
      ? "image/webp"
      : "image/jpeg";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error(`Could not compress ${file.name}.`)),
      mime,
      // PNG ignores the quality argument, so passing it is harmless.
      QUALITY,
    );
  });

  // A tiny, already-optimised source can come out larger after re-encoding.
  const useOriginal = blob.size >= file.size && scale === 1;
  const finalBlob = useOriginal ? file : blob;
  const finalType = useOriginal ? file.type : mime;

  return {
    blob: finalBlob,
    extension: finalType.replace("image/", "").replace("jpeg", "jpg"),
    width,
    height,
    previewUrl: URL.createObjectURL(finalBlob),
    originalBytes: file.size,
    compressedBytes: finalBlob.size,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
