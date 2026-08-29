"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Package,
  RotateCcw,
  ShoppingCart,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { OrderStatusPill } from "@/components/admin/status-pill";
import { cn, formatPrice } from "@/lib/utils";

/** Shape returned by /api/admin/stats. */
type Stats = {
  kpis: Record<
    "revenue" | "orders" | "returns" | "lowStock",
    { value: number; delta: number }
  > & {
    // Customers carries the lifetime figure alongside the windowed one, because
    // "new this week" is the trend but "how many altogether" is the context.
    customers: { value: number; delta: number; total: number };
  };
  trend: Array<{ day: string; total: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    category: string | null;
    unitsSold: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    email: string;
    total: number;
    status: string;
    createdAt: string;
    user: { name: string | null } | null;
  }>;
};

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export default function AdminDashboardPage() {
  const [range, setRange] = useState("7d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Abort in-flight requests when the range changes, so a slow earlier
    // response can't land after a faster later one and show stale numbers.
    const controller = new AbortController();

    setError(null);
    fetch(`/api/admin/stats?range=${range}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed.");
        return res.json();
      })
      .then(setStats)
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      });

    return () => controller.abort();
  }, [range]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Store performance at a glance.
          </p>
        </div>

        <div className="flex rounded-lg border border-ink-200 bg-surface p-1">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                range === option.value
                  ? "bg-ink-900 text-ink-50"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          icon={Wallet}
          value={stats ? formatPrice(stats.kpis.revenue.value) : null}
          delta={stats?.kpis.revenue.delta}
        />
        <StatCard
          label="Orders"
          icon={ShoppingCart}
          value={stats ? String(stats.kpis.orders.value) : null}
          delta={stats?.kpis.orders.delta}
        />
        <StatCard
          // "New customers", not "Customers": the figure is now windowed like
          // the others, and a range-scoped count under a lifetime-sounding
          // label would read as the customer base having vanished.
          label="New customers"
          icon={Users}
          value={stats ? String(stats.kpis.customers.value) : null}
          delta={stats?.kpis.customers.delta}
          footnote={
            stats
              ? `${stats.kpis.customers.total.toLocaleString()} total`
              : undefined
          }
        />
        <StatCard
          label="Returns"
          icon={RotateCcw}
          value={stats ? String(stats.kpis.returns.value) : null}
          delta={stats?.kpis.returns.delta}
          // More refunds is bad news, so the usual green-for-up is inverted.
          invertDelta
        />
      </div>

      {stats && stats.kpis.lowStock.value > 0 ? (
        <Link
          href="/admin/products?status=low"
          className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition-colors hover:bg-amber-100"
        >
          <TriangleAlert size={18} className="shrink-0" />
          <span>
            <strong>{stats.kpis.lowStock.value}</strong>{" "}
            {stats.kpis.lowStock.value === 1 ? "product is" : "products are"}{" "}
            at or below the low-stock threshold.
          </span>
          <span className="ml-auto shrink-0 font-semibold underline">
            Review
          </span>
        </Link>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <SalesTrend trend={stats?.trend ?? null} className="lg:col-span-3" />
        <TopProducts
          products={stats?.topProducts ?? null}
          className="lg:col-span-2"
        />
      </div>

      <RecentOrders orders={stats?.recentOrders ?? null} />
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  footnote,
  icon: Icon,
  invertDelta = false,
}: {
  label: string;
  value: string | null;
  delta?: number;
  /** Secondary figure for context, e.g. a lifetime total behind a windowed one. */
  footnote?: string;
  icon: typeof Wallet;
  invertDelta?: boolean;
}) {
  const rising = (delta ?? 0) >= 0;
  const good = invertDelta ? !rising : rising;

  return (
    <div className="rounded-card border border-ink-200 bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <Icon size={16} className="text-ink-400" />
      </div>

      {value === null ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-ink-100" />
      ) : (
        <p className="mt-2 text-2xl font-bold tabular-nums text-ink-900">
          {value}
        </p>
      )}

      {delta !== undefined && value !== null ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-semibold",
            good ? "text-green-600" : "text-red-600",
          )}
        >
          {rising ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(delta).toFixed(1)}%
          <span className="font-normal text-ink-400">vs previous</span>
          {footnote ? (
            <span className="ml-auto font-normal text-ink-400">{footnote}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Sales sparkline.
 *
 * Hand-drawn bars rather than a charting library — the shape of the trend is
 * all this needs to convey, and it keeps the bundle lean.
 */
function SalesTrend({
  trend,
  className,
}: {
  trend: Stats["trend"] | null;
  className?: string;
}) {
  const max = Math.max(1, ...(trend ?? []).map((point) => point.total));

  return (
    <section
      className={cn(
        "rounded-card border border-ink-200 bg-surface p-5",
        className,
      )}
    >
      <h2 className="text-sm font-bold text-ink-900">Sales trend</h2>

      {trend === null ? (
        <div className="mt-6 h-40 animate-pulse rounded bg-ink-100" />
      ) : trend.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-500">
          No paid orders in this period yet.
        </p>
      ) : (
        <div className="mt-6 flex h-40 items-end gap-1.5">
          {trend.map((point) => (
            <div
              key={point.day}
              className="group relative flex-1 rounded-t bg-brand-500/80 transition-colors hover:bg-brand-600"
              style={{ height: `${Math.max(4, (point.total / max) * 100)}%` }}
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-[11px] font-medium text-ink-50 group-hover:block">
                {formatPrice(point.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TopProducts({
  products,
  className,
}: {
  products: Stats["topProducts"] | null;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-card border border-ink-200 bg-surface p-5",
        className,
      )}
    >
      <h2 className="text-sm font-bold text-ink-900">Top products</h2>

      {products === null ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-ink-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-500">
          Nothing sold yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {products.map((product) => (
            <li key={product.id} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
                <Package size={16} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">
                  {product.name}
                </p>
                <p className="text-xs text-ink-500">
                  {product.unitsSold} sold
                  {product.category ? ` · ${product.category}` : ""}
                </p>
              </div>

              <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
                {formatPrice(product.revenue)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentOrders({ orders }: { orders: Stats["recentOrders"] | null }) {
  return (
    <section className="mt-4 rounded-card border border-ink-200 bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">Recent orders</h2>
        <Link
          href="/admin/orders"
          className="text-xs font-semibold text-brand-700 hover:underline"
        >
          View all
        </Link>
      </div>

      {orders === null ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-ink-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-500">No orders yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-xs uppercase tracking-wide text-ink-500">
                <th className="py-2 pr-4 font-semibold">Order</th>
                <th className="py-2 pr-4 font-semibold">Customer</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-ink-900 hover:text-brand-700"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="max-w-[200px] truncate py-2.5 pr-4 text-ink-600">
                    {order.user?.name ?? order.email}
                  </td>
                  <td className="py-2.5 pr-4">
                    <OrderStatusPill status={order.status} />
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-ink-900">
                    {formatPrice(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

