"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ORDER_STATUSES, OrderStatusPill } from "@/components/admin/status-pill";
import { cn, formatPrice } from "@/lib/utils";

type AdminOrder = {
  id: string;
  orderNumber: string;
  email: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
  user: { name: string | null } | null;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  /** Order currently being updated, so only that row's select is disabled. */
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      const res = await fetch(`/api/admin/orders?${params}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load orders.");

      setOrders(body.orders);
      setPages(body.pagination.pages);
      setTotal(body.pagination.total);
    } catch (err) {
      setError((err as Error).message);
      setOrders([]);
    }
  }, [debouncedQuery, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(order: AdminOrder, next: string) {
    if (next === order.status) return;

    // Restocking is a side effect the admin should be aware of before it runs.
    if (next === "CANCELLED" || next === "REFUNDED") {
      const confirmed = window.confirm(
        `Mark ${order.orderNumber} as ${next.toLowerCase()}? The items will be returned to stock.`,
      );
      if (!confirmed) return;
    }

    setUpdatingId(order.id);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not update the order.");

      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Orders
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {orders ? `${total} order${total === 1 ? "" : "s"}` : "Loading…"}
        </p>
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
            placeholder="Search order number or email…"
            aria-label="Search orders"
            className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900"
          />
        </div>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-ink-900"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
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
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">
                  <span className="sr-only">View order</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {orders === null ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-9 animate-pulse rounded bg-ink-100" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-ink-500"
                  >
                    No orders match those filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-ink-900 hover:text-brand-700 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-ink-600">
                      {order.user?.name ?? order.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                      {new Date(order.createdAt).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-600">
                      {order.itemCount}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-ink-900">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <OrderStatusPill status={order.status} />
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(event) =>
                            changeStatus(order, event.target.value)
                          }
                          aria-label={`Change status of ${order.orderNumber}`}
                          className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700 outline-none focus:border-ink-900 disabled:opacity-50"
                        >
                          {ORDER_STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-xs font-semibold text-brand-700 hover:underline"
                      >
                        View
                      </Link>
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
