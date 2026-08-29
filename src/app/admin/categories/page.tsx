"use client";

import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import {
  CategoryFormDialog,
  type AdminCategory,
} from "@/components/admin/category-form";
import { ProductFormDialog } from "@/components/admin/product-form";
import { resolveCategoryIcon } from "@/lib/category-icons";
import { cn, formatPrice } from "@/lib/utils";

/**
 * Admin category management.
 *
 * A tree table rather than the paginated list the products page uses: the
 * taxonomy is a couple of dozen rows, and the parent/child relationship is the
 * thing an admin needs to see at a glance. Parents are bold rows; children are
 * indented beneath their parent.
 *
 * Each row expands to list the products inside that category, reusing the
 * existing `?categoryId=` filter on the products endpoint and the products
 * page's own edit dialog — so a product can be fixed without leaving here.
 */

/** Exactly the shape `ProductFormDialog` needs, so a row can open it directly. */
type CategoryProduct = {
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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Category being edited, or `null` for the create form. `undefined` = closed. */
  const [editing, setEditing] = useState<AdminCategory | null | undefined>(
    undefined,
  );

  const [expanded, setExpanded] = useState<string | null>(null);
  const [products, setProducts] = useState<CategoryProduct[] | null>(null);

  /** Product from an expanded row being edited, or `null` for the create form. */
  const [editingProduct, setEditingProduct] = useState<
    CategoryProduct | null | undefined
  >(undefined);

  const load = useCallback(async () => {
    setError(null);

    try {
      const res = await fetch("/api/admin/categories");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load categories.");

      setCategories(body.categories);
    } catch (err) {
      setError((err as Error).message);
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Parents in position order, each followed by its own children. */
  const rows = useMemo(() => {
    if (!categories) return [];

    const byPosition = (a: AdminCategory, b: AdminCategory) =>
      a.position - b.position || a.name.localeCompare(b.name);

    const parents = categories.filter((c) => c.parentId === null).sort(byPosition);
    const orphans = categories
      .filter((c) => c.parentId !== null && !parents.some((p) => p.id === c.parentId))
      .sort(byPosition);

    return [...parents, ...orphans].flatMap((parent) => [
      { category: parent, depth: 0 },
      ...categories
        .filter((c) => c.parentId === parent.id)
        .sort(byPosition)
        .map((child) => ({ category: child, depth: 1 })),
    ]);
  }, [categories]);

  const loadProducts = useCallback(async (categoryId: string) => {
    setProducts(null);

    try {
      // 100 is the endpoint's clamped maximum; a category with more than that
      // is better managed from the paginated Products page.
      const res = await fetch(
        `/api/admin/products?categoryId=${categoryId}&perPage=100&sort=name`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load products.");

      setProducts(body.products);
    } catch (err) {
      setError((err as Error).message);
      setProducts([]);
    }
  }, []);

  async function toggleExpanded(category: AdminCategory) {
    if (expanded === category.id) {
      setExpanded(null);
      return;
    }

    setExpanded(category.id);
    await loadProducts(category.id);
  }

  /**
   * The homepage toggle writes straight through — a dialog round-trip for one
   * boolean would be tedious. Flipped locally first so the checkbox responds
   * immediately, and reverted by a reload if the request fails.
   */
  async function toggleFeatured(category: AdminCategory, featured: boolean) {
    setCategories(
      (current) =>
        current?.map((c) => (c.id === category.id ? { ...c, featured } : c)) ??
        null,
    );

    const res = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Could not update the category.");
      void load();
    }
  }

  async function handleDelete(category: AdminCategory) {
    const confirmed = window.confirm(
      `Delete “${category.name}” permanently? This can't be undone.`,
    );
    if (!confirmed) return;

    const res = await fetch(`/api/admin/categories/${category.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Could not delete the category.");
      return;
    }

    setError(null);
    void load();
  }

  const total = categories?.length ?? 0;
  // Only sub-categories reach the rail, so counting parents would overstate it.
  const onHomepage =
    categories?.filter((c) => c.featured && c.parentId !== null).length ?? 0;
  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Categories
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {categories
              ? `${total} categor${total === 1 ? "y" : "ies"} · ${onHomepage} on the homepage`
              : "Loading…"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-ink-50 transition-colors hover:bg-ink-800"
        >
          <Plus size={16} />
          New category
        </button>
      </header>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-card border border-ink-200 bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Products</th>
                <th className="px-4 py-3 font-semibold">Homepage</th>
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {categories === null ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-10 animate-pulse rounded bg-ink-100" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-ink-500"
                  >
                    No categories yet. Create the first one to get started.
                  </td>
                </tr>
              ) : (
                rows.map(({ category, depth }) => {
                  const isOpen = expanded === category.id;

                  return (
                    <Fragment key={category.id}>
                      <tr className={cn("hover:bg-ink-50", isOpen && "bg-ink-50")}>
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center gap-3"
                            style={{ paddingLeft: depth * 24 }}
                          >
                            <button
                              type="button"
                              onClick={() => void toggleExpanded(category)}
                              aria-expanded={isOpen}
                              aria-label={`${isOpen ? "Hide" : "Show"} products in ${category.name}`}
                              className="flex size-6 shrink-0 items-center justify-center rounded text-ink-400 transition-colors hover:bg-ink-200 hover:text-ink-900"
                            >
                              {isOpen ? (
                                <ChevronDown size={15} />
                              ) : (
                                <ChevronRight size={15} />
                              )}
                            </button>

                            <CategoryThumb category={category} />

                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "truncate text-ink-900",
                                  depth === 0 ? "font-bold" : "font-medium",
                                )}
                              >
                                {category.name}
                              </p>
                              {category.childCount > 0 ? (
                                <p className="text-xs text-ink-500">
                                  {category.childCount} sub-categor
                                  {category.childCount === 1 ? "y" : "ies"}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-ink-500">
                          <code className="text-xs">{category.slug}</code>
                        </td>

                        <td className="px-4 py-3 font-semibold tabular-nums text-ink-900">
                          {category.productCount}
                        </td>

                        <td className="px-4 py-3">
                          {category.parentId === null ? (
                            <span
                              title="The homepage rail shows sub-categories only"
                              className="text-xs text-ink-400"
                            >
                              —
                            </span>
                          ) : (
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={category.featured}
                                onChange={(event) =>
                                  void toggleFeatured(
                                    category,
                                    event.target.checked,
                                  )
                                }
                                aria-label={`Show ${category.name} on the homepage`}
                                className="size-4 rounded border-ink-300 text-ink-900 focus:ring-ink-900"
                              />
                              <span className="text-xs text-ink-500">
                                {category.featured ? "Shown" : "Hidden"}
                              </span>
                            </label>
                          )}
                        </td>

                        <td className="px-4 py-3 tabular-nums text-ink-600">
                          {category.position}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditing(category)}
                              aria-label={`Edit ${category.name}`}
                              className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(category)}
                              aria-label={`Delete ${category.name}`}
                              className="flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isOpen ? (
                        <tr className="bg-ink-50/60">
                          <td colSpan={6} className="px-4 pb-4 pt-0">
                            <ProductPanel
                              category={category}
                              products={products}
                              onEdit={setEditingProduct}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== undefined ? (
        <CategoryFormDialog
          category={editing}
          categories={categories ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void load();
          }}
        />
      ) : null}

      {editingProduct !== undefined ? (
        <ProductFormDialog
          product={editingProduct}
          onClose={() => setEditingProduct(undefined)}
          onSaved={() => {
            setEditingProduct(undefined);
            // Reload both: an edit can move a product to another category,
            // which changes the counts in the table as well as this panel.
            void load();
            if (expanded) void loadProducts(expanded);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Row thumbnail: the category image, or its icon when there's no image.
 *
 * The image field accepts any URL, but `next/image` throws for hosts missing
 * from `remotePatterns` in next.config.ts, and repo paths can point at a file
 * that was never added to /public. Either way an admin would see a broken tile
 * with no explanation, so a load failure falls back to the icon — the same
 * guard `category-carousel.tsx` uses on the storefront.
 */
function CategoryThumb({ category }: { category: AdminCategory }) {
  const [imageFailed, setImageFailed] = useState(false);

  const Icon = resolveCategoryIcon(category.icon);
  const showImage = Boolean(category.image) && !imageFailed;

  return (
    <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-100">
      {showImage ? (
        <Image
          src={category.image as string}
          alt=""
          fill
          sizes="40px"
          onError={() => setImageFailed(true)}
          className="object-cover"
        />
      ) : (
        <Icon size={16} aria-hidden="true" className="text-ink-400" />
      )}
    </div>
  );
}

/** Inline list of the products inside one category. */
function ProductPanel({
  category,
  products,
  onEdit,
}: {
  category: AdminCategory;
  products: CategoryProduct[] | null;
  onEdit: (product: CategoryProduct) => void;
}) {
  if (products === null) {
    return <div className="h-16 animate-pulse rounded-lg bg-ink-100" />;
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">
        No products in “{category.name}” yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-surface">
      <ul className="divide-y divide-ink-100">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
          >
            <span className="min-w-0 flex-1 truncate font-medium text-ink-900">
              {product.name}
            </span>
            <span className="text-xs text-ink-500">{product.sku}</span>
            <span className="tabular-nums text-ink-700">
              {formatPrice(product.price)}
            </span>
            <span
              className={cn(
                "tabular-nums",
                product.stock === 0 ? "text-red-600" : "text-ink-500",
              )}
            >
              {product.stock} in stock
            </span>
            {!product.isActive ? (
              <span className="rounded-full bg-ink-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-600">
                Inactive
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onEdit(product)}
              aria-label={`Edit ${product.name}`}
              className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <Pencil size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
