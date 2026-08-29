"use client";

import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useId, useRef, useState } from "react";

import {
  compressImage,
  formatBytes,
  type CompressedImage,
} from "@/lib/image-compress";
import { cn } from "@/lib/utils";

/**
 * Admin image uploader — drop zone, file picker, phone camera, or pasted URL.
 *
 * Uploads happen the moment a file is chosen rather than on form submit. Two
 * reasons: the admin sees the real stored image before committing anything, and
 * a slow upload doesn't hold the save button hostage. The parent only ever
 * holds an ordered list of URLs, so saving stays a plain JSON PATCH.
 *
 * Every file is compressed in the browser first (src/lib/image-compress.ts), so
 * a 6 MB phone photo leaves as ~250 KB. That's what keeps the storefront quick:
 * the bucket never holds anything bigger than the page needs.
 */

type Pending = {
  key: string;
  name: string;
  previewUrl: string;
  status: "compressing" | "uploading" | "error";
  error?: string;
  savings?: string;
};

export function ImageUploader({
  folder,
  value,
  onChange,
  multiple = false,
  max = 10,
  hint,
}: {
  /** Bucket sub-folder, e.g. `categories`. Lowercase and dashes only. */
  folder: string;
  /** Committed URLs, in display order. First one is the main image. */
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  max?: number;
  hint?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const limit = multiple ? max : 1;
  const used = value.length + pending.length;
  const full = used >= limit;

  function patchPending(key: string, changes: Partial<Pending>) {
    setPending((current) =>
      current.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    );
  }

  function dropPending(key: string, revoke?: string) {
    if (revoke) URL.revokeObjectURL(revoke);
    setPending((current) => current.filter((item) => item.key !== key));
  }

  async function upload(file: File, key: string) {
    let compressed: CompressedImage | null = null;

    try {
      compressed = await compressImage(file);

      patchPending(key, {
        status: "uploading",
        previewUrl: compressed.previewUrl,
        savings: `${formatBytes(compressed.originalBytes)} → ${formatBytes(compressed.compressedBytes)}`,
      });

      const body = new FormData();
      // The extension must match what was actually encoded, not the original —
      // a HEIC that came out as WebP would otherwise be stored as .heic.
      body.append(
        "file",
        compressed.blob,
        `${file.name.replace(/\.[^.]+$/, "")}.${compressed.extension}`,
      );

      const res = await fetch(`/api/admin/upload?folder=${folder}`, {
        method: "POST",
        body,
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Upload failed.");

      // Replacing in single mode, appending in gallery mode.
      onChange(multiple ? [...value, payload.url] : [payload.url]);
      dropPending(key, compressed.previewUrl);
    } catch (err) {
      // Keep the tile so the admin can see which file failed and retry it.
      patchPending(key, { status: "error", error: (err as Error).message });
      if (compressed) URL.revokeObjectURL(compressed.previewUrl);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    const room = Math.max(0, limit - used);
    const accepted = Array.from(files).slice(0, multiple ? room : 1);

    const queued = accepted.map((file, index) => ({
      key: `${file.name}-${index}-${performance.now()}`,
      name: file.name,
      previewUrl: "",
      status: "compressing" as const,
    }));

    setPending((current) => [...current, ...queued]);

    // Sequential, not Promise.all: three phone photos compressing at once
    // stalls the main thread and the dialog stops responding.
    void queued.reduce(
      (chain, item, index) =>
        chain.then(() => upload(accepted[index], item.key)),
      Promise.resolve(),
    );
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function addUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    onChange(multiple ? [...value, url] : [url]);
    setUrlDraft("");
  }
  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
          dragging ? "border-ink-900 bg-ink-50" : "border-ink-200",
          full && "opacity-60",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple={multiple}
          disabled={full}
          onChange={(event) => {
            handleFiles(event.target.files);
            // Reset so re-picking the same file fires onChange again.
            event.target.value = "";
          }}
          className="sr-only"
        />

        <ImagePlus size={20} aria-hidden="true" className="mx-auto text-ink-400" />

        <label
          htmlFor={inputId}
          className={cn(
            "mt-2 block text-sm font-semibold text-ink-900",
            full ? "cursor-not-allowed text-ink-400" : "cursor-pointer",
          )}
        >
          {full
            ? multiple
              ? `${max} images is the maximum`
              : "Remove the current image to replace it"
            : "Choose a photo"}
        </label>

        <p className="mt-1 text-xs text-ink-400">
          {/* `accept="image/*"` is what makes iOS and Android offer the camera. */}
          Drag one here, or tap to use your camera or gallery. Resized to 1600px
          before uploading.
        </p>
      </div>

      {pending.length > 0 || value.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, index) => (
            <li
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-ink-200 bg-ink-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- an arbitrary
                  pasted URL can be any host, and next/image throws for hosts
                  missing from remotePatterns. A raw <img> shows it regardless. */}
              <img
                src={url}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />

              {index === 0 && multiple ? (
                // Literal black/white, not ink tokens: this sits on top of an
                // arbitrary uploaded photo, so it needs the same contrast in
                // both themes. `bg-ink-900` would inevitably invert to a pale
                // chip and take the white text with it.
                <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Main
                </span>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                {multiple ? (
                  <span className="flex gap-1">
                    <TileButton
                      label={`Move image ${index + 1} earlier`}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowLeft size={13} />
                    </TileButton>
                    <TileButton
                      label={`Move image ${index + 1} later`}
                      disabled={index === value.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowRight size={13} />
                    </TileButton>
                  </span>
                ) : (
                  <span />
                )}

                <TileButton
                  label={`Remove image ${index + 1}`}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 size={13} />
                </TileButton>
              </div>
            </li>
          ))}

          {pending.map((item) => (
            <li
              key={item.key}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border px-2 text-center",
                item.status === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-ink-200 bg-ink-50",
              )}
            >
              {item.previewUrl && item.status !== "error" ? (
                /* eslint-disable-next-line @next/next/no-img-element -- a local
                   blob: preview, which next/image can't take. */
                <img
                  src={item.previewUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover opacity-40"
                />
              ) : null}

              {item.status === "error" ? (
                <>
                  <TriangleAlert size={16} aria-hidden="true" className="text-red-600" />
                  <p className="text-[11px] leading-tight text-red-700">
                    {item.error}
                  </p>
                  <button
                    type="button"
                    onClick={() => dropPending(item.key)}
                    className="text-[11px] font-semibold text-red-700 underline"
                  >
                    Dismiss
                  </button>
                </>
              ) : (
                <>
                  <Loader2
                    size={16}
                    aria-hidden="true"
                    className="relative animate-spin text-ink-500"
                  />
                  <p className="relative text-[11px] font-medium text-ink-600">
                    {item.status === "compressing" ? "Resizing…" : "Uploading…"}
                  </p>
                  {item.savings ? (
                    <p className="relative text-[10px] tabular-nums text-ink-400">
                      {item.savings}
                    </p>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex gap-2">
        <input
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // Inside a form, Enter would submit it.
            event.preventDefault();
            addUrl();
          }}
          placeholder="…or paste an image URL"
          aria-label="Image URL"
          className="min-w-0 flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={full || urlDraft.trim() === ""}
          className="shrink-0 rounded-lg border border-ink-300 px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-900 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {hint ? <p className="mt-1.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

function TileButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // Also theme-independent — see the "Main" badge above. These float over
      // the thumbnail itself, so the pairing has to be a fixed white chip with
      // a black glyph rather than anything that tracks the panel colour.
      className="flex size-6 items-center justify-center rounded bg-white/90 text-black transition-colors hover:bg-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}

