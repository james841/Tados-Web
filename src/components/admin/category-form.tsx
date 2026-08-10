"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { CATEGORY_ICON_NAMES } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

/**
 * Create / edit category dialog.
 *
 * Mirrors `product-form.tsx` — same dialog shell, same `fieldErrors` contract
 * against the API's Zod layer, same "slug follows the name until you touch it"
 * behaviour — so the two admin forms stay predictable against each other.
 */

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  position: number;
  featured: boolean;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
  childCount: number;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  image: string;
  icon: string;
  parentId: string;
  position: string;
  featured: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  description: "",
  image: "",
  icon: "",
  parentId: "",
  position: "0",
  featured: false,
};

/** "Smart Door Locks" -> "smart-door-locks" */
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CategoryFormDialog({
  category,
  categories,
  onClose,
  onSaved,
}: {
  /** `null` for the create form. */
  category: AdminCategory | null;
  /** The full list, used to offer parents. Saves a second fetch. */
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = category !== null;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEdit);

  useEffect(() => {
    if (!category) {
      setForm(EMPTY);
      return;
    }

    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      image: category.image ?? "",
      icon: category.icon ?? "",
      parentId: category.parentId ?? "",
      position: String(category.position),
      featured: category.featured,
    });
  }, [category]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  /**
   * Only top-level categories can be parents — the storefront renders two
   * levels. A category being edited is excluded from its own list, and one that
   * already has children can't be nested at all (the API enforces both too).
   */
  const hasChildren = (category?.childCount ?? 0) > 0;
  const parentOptions = categories.filter(
    (option) => option.parentId === null && option.id !== category?.id,
  );

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
      // Empty inputs must clear the column, not be stored as "".
      description: form.description.trim() === "" ? null : form.description,
      image: form.image.trim() === "" ? null : form.image.trim(),
      icon: form.icon === "" ? null : form.icon,
      parentId: form.parentId === "" ? null : form.parentId,
      position: form.position === "" ? 0 : form.position,
      featured: form.featured,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/admin/categories/${category.id}` : "/api/admin/categories",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = await res.json();

      if (!res.ok) {
        setFieldErrors(body.details ?? {});
        throw new Error(body.error ?? "Could not save the category.");
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
        aria-labelledby="category-form-title"
        className="w-full max-w-2xl rounded-card bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <h2
            id="category-form-title"
            className="text-lg font-bold text-ink-900"
          >
            {isEdit ? "Edit category" : "New category"}
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
            <Field
              label="Name"
              error={fieldErrors.name}
              className="sm:col-span-2"
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
              label="Slug"
              error={fieldErrors.slug}
              hint="The URL: /category/your-slug"
            >
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

            <Field
              label="Parent category"
              error={fieldErrors.parentId}
              hint={
                hasChildren
                  ? "Has sub-categories, so it must stay top-level"
                  : "Leave blank for a top-level category"
              }
            >
              <select
                value={form.parentId}
                disabled={hasChildren}
                onChange={(event) => update("parentId", event.target.value)}
                className={cn(inputClass, "disabled:bg-ink-50 disabled:text-ink-400")}
              >
                <option value="">— None (top level) —</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Description"
              error={fieldErrors.description}
              className="sm:col-span-2"
              hint="Optional — shown on the category page"
            >
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                className={cn(inputClass, "resize-none")}
              />
            </Field>

            <Field
              label="Image URL"
              error={fieldErrors.image}
              hint="e.g. /products/cat-smart-locks.jpg"
            >
              <input
                value={form.image}
                onChange={(event) => update("image", event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field
              label="Icon"
              error={fieldErrors.icon}
              hint="Used when there's no image"
            >
              <select
                value={form.icon}
                onChange={(event) => update("icon", event.target.value)}
                className={inputClass}
              >
                <option value="">— None —</option>
                {CATEGORY_ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Position"
              error={fieldErrors.position}
              hint="Lower numbers sort first"
            >
              <input
                type="number"
                min="0"
                value={form.position}
                onChange={(event) => update("position", event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <fieldset className="mt-5 border-t border-ink-200 pt-4">
            <legend className="sr-only">Storefront placement</legend>
            <Toggle
              label="Show on homepage"
              hint={
                form.parentId === ""
                  ? "The homepage rail shows sub-categories only — pick a parent above to enable this."
                  : "Adds a tile to the “Most Popular Categories” rail."
              }
              disabled={form.parentId === ""}
              checked={form.featured}
              onChange={(value) => update("featured", value)}
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
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create category"}
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
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-2.5 text-sm text-ink-700",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded border-ink-300 text-ink-900 focus:ring-ink-900 disabled:opacity-40"
      />
      <span>
        <span
          className={cn(
            "font-medium",
            disabled ? "text-ink-400" : "text-ink-900",
          )}
        >
          {label}
        </span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-400">{hint}</span> : null}
      </span>
    </label>
  );
}
