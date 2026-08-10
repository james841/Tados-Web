"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Create / edit product dialog.
 *
 * Field errors come back from the API's Zod layer keyed by field name, so the
 * same validation runs regardless of whether the request came from this form
 * or from a script — the form just renders whatever the server objected to.
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
  imageUrl: string;
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
  imageUrl: "",
  isActive: true,
  isFeatured: false,
  isBestseller: false,
  isNewArrival: true,
};

/** "Smart Door Lock" -> "smart-door-lock" */
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

  const [form, setForm] = useState<FormState>(EMPTY);
  const [categories, setCategories] = useState<Option[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Once an admin edits the slug by hand, stop overwriting it from the name.
  const [slugTouched, setSlugTouched] = useState(isEdit);

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
      return;
    }

    fetch(`/api/admin/products/${product.id}`)
      .then((res) => res.json())
      .then((body) =>
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
          imageUrl: body.images?.[0]?.url ?? "",
          isActive: body.isActive ?? true,
          isFeatured: body.isFeatured ?? false,
          isBestseller: body.isBestseller ?? false,
          isNewArrival: body.isNewArrival ?? false,
        }),
      )
      .catch(() => setError("Could not load this product."));
  }, [product]);

  // Escape closes, matching the cart drawer's behaviour.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
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
      images: form.imageUrl ? [{ url: form.imageUrl, alt: form.name }] : [],
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

      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="w-full max-w-2xl rounded-card bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <h2
            id="product-form-title"
            className="text-lg font-bold text-ink-900"
          >
            {isEdit ? "Edit product" : "New product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-colors hover:bg-ink-200"
          >
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          {error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={fieldErrors.name} className="sm:col-span-2">
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

            <Field label="Slug" error={fieldErrors.slug}>
              <input
                required
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  update("slug", event.target.value);
                }}
                className={inputClass}
              />
            </Field>

            <Field label="SKU" error={fieldErrors.sku}>
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

            <Field label="Image URL" hint="e.g. /products/lock-1.jpg">
              <input
                value={form.imageUrl}
                onChange={(event) => update("imageUrl", event.target.value)}
                className={inputClass}
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

          <div className="mt-6 flex justify-end gap-2">
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
              className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900";

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
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
