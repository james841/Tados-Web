"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import { ArrowLeft, CreditCard, MapPin, Package, User } from "lucide-react";

import { useAdminFeedback } from "@/components/admin/feedback";
import { ORDER_STATUSES, OrderStatusPill } from "@/components/admin/status-pill";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { MANUAL_PAYMENT_PROVIDER } from "@/lib/checkout-mode";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";

/**
 * /admin/orders/[id] — everything needed to fulfil one order.
 *
 * Client-rendered so the status dropdown can update in place, matching the
 * behaviour of the orders table it's reached from.
 */

type OrderDetail = {
  id: string;
  orderNumber: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string } | null;
  address: {
    firstName: string;
    lastName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  } | null;
  items: {
    id: string;
    name: string;
    sku: string;
    image: string | null;
    price: number;
    quantity: number;
  }[];
  payment: {
    status: string;
    provider: string;
    amount: number;
    pfPaymentId: string | null;
    createdAt: string;
  } | null;
};

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { done, failed, confirm } = useAdminFeedback();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  /** Reserved for a failed *load* — action outcomes go to the feedback ledger. */
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const body = await res.json();

      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error(body.error ?? "Could not load the order.");

      setOrder(body);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** `select` is passed in so a declined confirm can be put back — see the
   *  orders table, which has the same problem for the same reason. */
  async function changeStatus(next: string, select: HTMLSelectElement) {
    if (!order || next === order.status) return;

    // Restocking is a side effect the admin should be aware of before it runs,
    // and it isn't symmetrical — see the sheet's wording.
    if (next === "CANCELLED" || next === "REFUNDED") {
      const confirmed = await confirm({
        impact: "Adjusts stock",
        title: `Mark ${order.orderNumber} as ${next.toLowerCase()}?`,
        detail:
          "Every item on the order goes back into stock. Moving the status on again later does not take it out again, so stock would need a manual correction.",
        action: next === "CANCELLED" ? "Mark cancelled" : "Mark refunded",
        tone: "danger",
      });

      if (!confirmed) {
        select.value = order.status;
        return;
      }
    }

    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not update the order.");

      done(
        "Status updated",
        body.restocked
          ? `${order.orderNumber} is ${next.toLowerCase()} and its items are back in stock.`
          : `${order.orderNumber} is now ${next.toLowerCase()}.`,
      );

      await load();
    } catch (err) {
      failed("Couldn't update", (err as Error).message);
      select.value = order.status;
    } finally {
      setUpdating(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-bold text-ink-900">Order not found</h1>
        <p className="mt-2 text-sm text-ink-500">
          It may have been deleted, or the link is wrong.
        </p>
        <Link
          href="/admin/orders"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
        >
          <ArrowLeft size={16} />
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft size={16} />
        Back to orders
      </Link>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!order ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-card bg-ink-100"
            />
          ))}
        </div>
      ) : (
        <>
          <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-ink-200 pb-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-ink-900">
                  {order.orderNumber}
                </h1>
                <OrderStatusPill status={order.status} />
              </div>
              <p className="mt-1.5 text-sm text-ink-500">
                Placed {formatDateTime(order.createdAt)}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-ink-600">Status</span>
              <select
                value={order.status}
                disabled={updating}
                onChange={(event) => {
                  // Captured synchronously — React clears `currentTarget` once
                  // the handler returns, and the confirm is awaited.
                  const select = event.currentTarget;
                  void changeStatus(select.value, select);
                }}
                aria-label={`Change status of ${order.orderNumber}`}
                className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-900 disabled:opacity-50"
              >
                {ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0 space-y-6">
              <Card
                title="Items"
                icon={<Package size={16} />}
                bodyClassName="p-0"
              >
                <ul className="divide-y divide-ink-100">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex gap-4 p-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-ink-300">
                            <Package size={20} />
                          </span>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            SKU {item.sku}
                          </p>
                          <p className="mt-0.5 text-sm text-ink-600">
                            {formatPrice(item.price)} × {item.quantity}
                          </p>
                        </div>

                        <p className="font-semibold tabular-nums text-ink-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Tracking">
                <OrderTimeline
                  status={order.status}
                  createdAt={order.createdAt}
                  updatedAt={order.updatedAt}
                />
              </Card>

              {order.notes ? (
                <Card title="Customer notes">
                  <p className="whitespace-pre-wrap text-sm text-ink-700">
                    {order.notes}
                  </p>
                </Card>
              ) : null}
            </div>

            <aside className="space-y-6">
              <Card title="Summary">
                <dl className="space-y-2.5 text-sm">
                  <Row label="Subtotal" value={formatPrice(order.subtotal)} />
                  <Row
                    label="Shipping"
                    value={
                      order.shipping === 0
                        ? "Free"
                        : formatPrice(order.shipping)
                    }
                  />
                  {order.discount > 0 ? (
                    <Row
                      label="Discount"
                      value={`−${formatPrice(order.discount)}`}
                    />
                  ) : null}
                  {order.tax > 0 ? (
                    <Row label="Tax" value={formatPrice(order.tax)} />
                  ) : null}

                  <div className="flex items-center justify-between border-t border-ink-200 pt-3">
                    <dt className="font-bold text-ink-900">Total</dt>
                    <dd className="text-lg font-extrabold tabular-nums text-ink-900">
                      {formatPrice(order.total)}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card title="Customer" icon={<User size={16} />}>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-ink-900">
                    {order.user?.name ??
                      (order.address
                        ? `${order.address.firstName} ${order.address.lastName}`
                        : "Guest")}
                  </p>
                  <a
                    href={`mailto:${order.email}`}
                    className="block truncate text-ink-600 hover:underline"
                  >
                    {order.email}
                  </a>
                  {order.address?.phone || order.phone ? (
                    <a
                      href={`tel:${order.address?.phone ?? order.phone}`}
                      className="block text-ink-600 hover:underline"
                    >
                      {order.address?.phone ?? order.phone}
                    </a>
                  ) : null}
                  {!order.user ? (
                    <p className="pt-1 text-xs text-ink-400">
                      Guest checkout — no account
                    </p>
                  ) : null}
                </div>
              </Card>

              <Card title="Delivery address" icon={<MapPin size={16} />}>
                {order.address ? (
                  <address className="space-y-0.5 text-sm not-italic text-ink-700">
                    <p className="font-semibold text-ink-900">
                      {order.address.firstName} {order.address.lastName}
                    </p>
                    <p>{order.address.line1}</p>
                    {order.address.line2 ? <p>{order.address.line2}</p> : null}
                    <p>
                      {order.address.city}, {order.address.province}
                    </p>
                    <p>{order.address.postalCode}</p>
                    <p>{order.address.country}</p>
                    <p className="pt-1 text-ink-500">{order.address.phone}</p>
                  </address>
                ) : (
                  <p className="text-sm text-ink-500">
                    No address on this order.
                  </p>
                )}
              </Card>

              <Card title="Payment" icon={<CreditCard size={16} />}>
                {order.payment ? (
                  <dl className="space-y-2.5 text-sm">
                    <Row
                      label="Status"
                      value={order.payment.status}
                      valueClassName={cn(
                        "font-semibold",
                        order.payment.status === "COMPLETE"
                          ? "text-green-700"
                          : order.payment.status === "PENDING"
                            ? "text-amber-700"
                            : "text-red-700",
                      )}
                    />
                    <Row
                      label="Provider"
                      value={
                        order.payment.provider === MANUAL_PAYMENT_PROVIDER
                          ? "Email — arranged by hand"
                          : order.payment.provider
                      }
                    />
                    <Row
                      label="Amount"
                      value={formatPrice(order.payment.amount)}
                    />
                    {order.payment.pfPaymentId ? (
                      <Row
                        label="PayFast ID"
                        value={order.payment.pfPaymentId}
                      />
                    ) : null}
                  </dl>
                ) : (
                  <p className="text-sm text-ink-500">
                    No payment record yet.
                  </p>
                )}
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  icon,
  children,
  bodyClassName,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-ink-200 bg-surface">
      <h2 className="flex items-center gap-2 border-b border-ink-100 px-5 py-3 text-sm font-bold uppercase tracking-wide text-ink-500">
        {icon}
        {title}
      </h2>
      <div className={bodyClassName ?? "p-5"}>{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-600">{label}</dt>
      <dd className={cn("truncate tabular-nums text-ink-900", valueClassName)}>
        {value}
      </dd>
    </div>
  );
}
