"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { cn, formatPrice } from "@/lib/utils";

type AdminCustomer = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);

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

    try {
      const res = await fetch(`/api/admin/customers?${params}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load customers.");

      setCustomers(body.customers);
      setPages(body.pagination.pages);
      setTotal(body.pagination.total);
    } catch (err) {
      setError((err as Error).message);
      setCustomers([]);
    }
  }, [debouncedQuery, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Customers
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {customers ? `${total} account${total === 1 ? "" : "s"}` : "Loading…"}
        </p>
      </header>

      <div className="relative mt-6 max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search customers"
          className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900"
        />
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
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Orders</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Lifetime spend
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {customers === null ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-10 animate-pulse rounded bg-ink-100" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-ink-500"
                  >
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-xs font-bold uppercase text-ink-500">
                          {customer.image ? (
                            <Image
                              src={customer.image}
                              alt=""
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : (
                            (customer.name ?? customer.email).charAt(0)
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate font-medium text-ink-900">
                            {customer.name ?? "—"}
                            {customer.role === "ADMIN" ? (
                              <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Admin
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-ink-500">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                      {new Date(customer.createdAt).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-3 tabular-nums text-ink-600">
                      {customer.orderCount}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">
                      {formatPrice(customer.totalSpent)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 ? (
          <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3">
            <p className="text-xs text-ink-500">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className={paginationClass}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((current) => current + 1)}
                className={paginationClass}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const paginationClass = cn(
  "rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors",
  "hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40",
);
