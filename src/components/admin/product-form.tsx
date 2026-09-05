"use client";

import { useEffect, useState } from "react";

import { cn, slugify } from "@/lib/utils";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { useAdminFeedback } from "@/components/admin/feedback";
import { ImageUploader } from "@/components/admin/image-uploader";

/**
 * Create / edit product dialog.
 *
 * Field errors come back from the API's Zod layer keyed by field name, so the
 * same validation runs regardless of whether the request came from this form
 * or from a script — the form just renders whatever the server objected to.
 *
 * Name and SKU accept any character. The web address is derived from the name
 * and cleaned server-side, so punctuation, accents or a script with no Latin
 * equivalent in the name can never block a save.
 *
 * Renaming a saved product re-derives its address, and the form says which
 * address it is moving to. Leaving the address behind was the bug: a product
 * renamed to "Smart video doorbell" kept living at its original
 * /products/smart-life-tuya-wifi-hd-video-doorbell-… address, so the old name
 * was still what anyone saw in the URL and in a link they shared.
 */

type Option = { id: string; label: string };

type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  category: { id: string; name: string } | null;
};

type FormState = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  lowStockAt: string;
  categoryId: string;
  /** Ordered gallery URLs. The first is the card/hero image. */
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isNewArrival: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  lowStockAt: "5",
  categoryId: "",
  images: [],
  isActive: true,
  isFeatured: false,
  isBestseller: false,
  isNewArrival: true,
};

/**
 * The web address to save, given whatever the admin typed.
 *
 * Falls through name -> SKU -> a constant, because every one of those can
 * legitimately slugify to nothing: a product named "智能门锁" has no Latin
 * characters, and a SKU of "———" has none either. The server appends a suffix
 * if the result is taken, so even "product" always saves.
 */
function resolveSlug(form: FormState) {
  return (
    slugify(form.slug) || slugify(form.name) || slugify(form.sku) || "product"
  );
}

export function ProductFormDialog({
  product,
  onClose,
  onSaved,
}: {
  product: ProductSummary | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = product !== null;

  const { done } = useAdminFeedback();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [categories, setCategories] = useState<Option[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Once an admin edits the address by hand, stop overwriting it from the name.
  // This starts false even on edit, which is the whole point: it used to start
  // true, so renaming a saved product left its address on the old name forever
  // and the old name stayed in the URL, in shared links and in search results.
  const [slugTouched, setSlugTouched] = useState(false);
  // The address as last saved, so a rename can say what it's about to change.
  const [savedSlug, setSavedSlug] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((body) => setCategories(body.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  // On edit, fetch the full record — the table row only carries a summary.
  useEffect(() => {
    if (!product) {
      setForm(EMPTY);
      setSlugTouched(false);
      setSavedSlug("");
      return;
    }

    fetch(`/api/admin/products/${product.id}`)
      .then((res) => res.json())
      .then((body) => {
        setSlugTouched(false);
        setSavedSlug(body.slug ?? "");
        setForm({
          name: body.name ?? "",
          slug: body.slug ?? "",
          sku: body.sku ?? "",
          description: body.description ?? "",
          price: String(body.price ?? ""),
          compareAtPrice: body.compareAtPrice
            ? String(body.compareAtPrice)
            : "",
          stock: String(body.stock ?? 0),
          lowStockAt: String(body.lowStockAt ?? 5),
          categoryId: body.categoryId ?? "",
          // The whole gallery, not just the first image: the form sends this
          // list back on save, and anything dropped here would be deleted.
          images: (body.images ?? []).map(
            (image: { url: string }) => image.url,
          ),
          isActive: body.isActive ?? true,
          isFeatured: body.isFeatured ?? false,
          isBestseller: body.isBestseller ?? false,
          isNewArrival: body.isNewArrival ?? false,
        });
      })
      .catch(() => setError("Could not load this product."));
  }, [product]);

  // Escape closes, and the page behind stays put — see AdminDialog.

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // What will actually be saved as the address, and whether that moves the
  // product. A rename rewriting the address is the behaviour we want — but it
  // does break any link already out there, so the form says so rather than
  // letting it be discovered from a 404.
  const nextSlug = resolveSlug(form);
  const slugWillChange = isEdit && savedSlug !== "" && nextSlug !== savedSlug;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      name: form.name,
      slug: resolveSlug(form),
      sku: form.sku,
      description: form.description,
      price: form.price,
      // Empty inputs must clear the column, not be sent as "".
      compareAtPrice: form.compareAtPrice === "" ? null : form.compareAtPrice,
      stock: form.stock,
      lowStockAt: form.lowStockAt,
      categoryId: form.categoryId,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      isBestseller: form.isBestseller,
      isNewArrival: form.isNewArrival,
      images: form.images.map((url) => ({ url, alt: form.name })),
    };

    try {
      const res = await fetch(
        isEdit ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = await res.json();

      if (!res.ok) {
        setFieldErrors(body.details ?? {});
        throw new Error(body.error ?? "Could not save the product.");
      }

      // Whether it's visible is the thing most easily got wrong here — a
      // product saved with Active off is a save that looks like it did nothing.
      // The moved address is worth saying too: the rename is deliberate, but
      // any link already shared for the old one has just stopped working.
      done(
        isEdit ? "Saved" : "Created",
        [
          form.isActive
            ? `“${form.name}” is live on the storefront.`
            : `“${form.name}” is saved, but Active is off — the storefront won't list it.`,
          slugWillChange ? `Its link is now /products/${nextSlug}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
      );

      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog
      title={isEdit ? "Edit product" : "New product"}
      titleId="product-form-title"
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-ink-50 transition-colors hover:bg-ink-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          error={fieldErrors.name}
          className="sm:col-span-2"
          hint="Anything you like — punctuation, accents and symbols are all fine."
        >
          <input
            required
            value={form.name}
            onChange={(event) => {
              update("name", event.target.value);
              if (!slugTouched) update("slug", slugify(event.target.value));
            }}
            className={inputClass}
          />
        </Field>

        <Field
          label="Web address"
          error={fieldErrors.slug}
          warning={
            slugWillChange
              ? `Saving moves this product to /products/${nextSlug}. The old link stops working — type the old address back in here if you need to keep it.`
              : undefined
          }
          hint="The end of the product's link. Follows the name — leave it alone unless you want a shorter one."
        >
          <input
            value={form.slug}
            onChange={(event) => {
              setSlugTouched(true);
              update("slug", event.target.value);
            }}
            className={inputClass}
          />
        </Field>

        <Field
          label="SKU"
          error={fieldErrors.sku}
          hint="Your own code for this item, e.g. TDS-LOCK-01. Must be different for every product."
        >
          <input
            required
            value={form.sku}
            onChange={(event) => update("sku", event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Description"
          error={fieldErrors.description}
          className="sm:col-span-2"
        >
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className={cn(inputClass, "resize-none")}
          />
        </Field>

        <Field label="Price (R)" error={fieldErrors.price}>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(event) => update("price", event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Compare-at price (R)" hint="Optional — shows as a strikethrough">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.compareAtPrice}
            onChange={(event) =>
              update("compareAtPrice", event.target.value)
            }
            className={inputClass}
          />
        </Field>

        <Field label="Stock" error={fieldErrors.stock}>
          <input
            required
            type="number"
            min="0"
            value={form.stock}
            onChange={(event) => update("stock", event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Low-stock alert at">
          <input
            type="number"
            min="0"
            value={form.lowStockAt}
            onChange={(event) => update("lowStockAt", event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Category" error={fieldErrors.categoryId}>
          <select
            required
            value={form.categoryId}
            onChange={(event) => update("categoryId", event.target.value)}
            className={inputClass}
          >
            <option value="">Select a category…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Photos"
          error={fieldErrors.images}
          className="sm:col-span-2"
          hint="Up to 10. The first is the one shown on product cards and search results — use the arrows to reorder."
        >
          <ImageUploader
            folder="products"
            multiple
            max={10}
            value={form.images}
            onChange={(urls) => update("images", urls)}
          />
        </Field>
      </div>

      <fieldset className="mt-5 flex flex-wrap gap-4 border-t border-ink-200 pt-4">
        <legend className="sr-only">Visibility flags</legend>
        <Toggle
          label="Active"
          checked={form.isActive}
          onChange={(value) => update("isActive", value)}
        />
        <Toggle
          label="Featured"
          checked={form.isFeatured}
          onChange={(value) => update("isFeatured", value)}
        />
        <Toggle
          label="Bestseller"
          checked={form.isBestseller}
          onChange={(value) => update("isBestseller", value)}
        />
        <Toggle
          label="New arrival"
          checked={form.isNewArrival}
          onChange={(value) => update("isNewArrival", value)}
        />
      </fieldset>
    </AdminDialog>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900";

function Field({
  label,
  hint,
  warning,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  /** Shown instead of the hint. For consequences of a valid change, not errors. */
  warning?: string;
  error?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-700">
        {label}
      </span>
      {children}
      {error?.length ? (
        <span className="mt-1 block text-xs text-red-600">{error[0]}</span>
      ) : warning ? (
        <span className="mt-1 block text-xs font-medium text-accent-600">
          {warning}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-400">{hint}</span>
      ) : null}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-ink-300 text-ink-900 focus:ring-ink-900"
      />
      {label}
    </label>
  );
}
