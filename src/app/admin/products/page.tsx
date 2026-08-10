"use client";

import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { ProductFormDialog } from "@/components/admin/product-form";
import { cn, formatPrice } from "@/lib/utils";

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  image: string | null;
  category: { id: string; name: string } | null;
};

type Pagination = { page: number; pages: number; total: number };

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "low", label: "Low stock" },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  /** Product being edited, or `null` for the create form. `undefined` = closed. */
  const [editing, setEditing] = useState<AdminProduct | null | undefined>(
    undefined,
  );

  // Debounce the search box so a fast typist doesn't fire a request per key.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams({ page: String(page), perPage: "20" });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (status) params.set("status", status);

    try {
      const res = await fetch(`/api/admin/products?${params}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load products.");

      setProducts(body.products);
      setPagination(body.pagination);
    } catch (err) {
      setError((err as Error).message);
      setProducts([]);
    }
  }, [debouncedQuery, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(product: AdminProduct) {
    // Deactivating is reversible, so a single confirm is proportionate.
    const confirmed = window.confirm(
      `Deactivate “${product.name}”? It will be hidden from the storefront but kept on past orders.`,
    );
    if (!confirmed) return;

    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Could not deactivate the product.");
      return;
    }

    void load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Products
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {pagination
              ? `${pagination.total} product${pagination.total === 1 ? "" : "s"}`
              : "Loading…"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
        >
          <Plus size={16} />
          New product
        </button>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or SKU…"
            aria-label="Search products"
            className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900"
          />
        </div>

        <div className="flex rounded-lg border border-ink-200 bg-white p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                status === filter.value
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-card border border-ink-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {products === null ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-10 animate-pulse rounded bg-ink-100" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-ink-500"
                  >
                    No products match those filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-ink-500">{product.sku}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-ink-600">
                      {product.category?.name ?? "—"}
                    </td>

                    <td className="px-4 py-3 font-semibold tabular-nums text-ink-900">
                      {formatPrice(product.price)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          product.stock === 0
                            ? "text-red-600"
                            : product.stock <= product.lowStockAt
                              ? "text-amber-600"
                              : "text-ink-900",
                        )}
                      >
                        {product.stock}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                          product.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-ink-200 text-ink-600",
                        )}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(product)}
                          aria-label={`Edit ${product.name}`}
                          className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          aria-label={`Deactivate ${product.name}`}
                          className="flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 ? (
          <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3">
            <p className="text-xs text-ink-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {editing !== undefined ? (
        <ProductFormDialog
          product={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
