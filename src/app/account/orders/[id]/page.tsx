import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, Package } from "lucide-react";

import { OrderTimeline } from "@/components/orders/order-timeline";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, formatDateTime, formatPrice, toNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

// Status changes outside this page's control, so it must never be cached.
export const dynamic = "force-dynamic";

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/account/orders/${id}`);

  /**
   * Ownership is part of the query, not a check afterwards.
   *
   * Matching on userId *or* email mirrors the account page: an order placed as
   * a guest before signing up still belongs to this person, and the email is
   * the only link back to it. A non-match falls through to notFound() rather
   * than a 403, which would confirm the order number exists to a stranger.
   */
  const order = await prisma.order.findFirst({
    where: {
      id,
      OR: [{ userId: user.id }, ...(user.email ? [{ email: user.email }] : [])],
    },
    include: {
      items: {
        include: { product: { select: { slug: true } } },
      },
      address: true,
      payment: { select: { status: true, provider: true } },
    },
  });

  if (!order) notFound();

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="container-page max-w-5xl py-10">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft size={16} />
        Back to my account
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-ink-200 pb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">
            {order.orderNumber}
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Placed {formatDateTime(order.createdAt)} · {itemCount}{" "}
            {itemCount === 1 ? "item" : "items"}
          </p>
        </div>

        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset",
            ORDER_STATUS_STYLES[order.status] ??
              "bg-ink-100 text-ink-700 ring-ink-600/20",
          )}
        >
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="text-lg font-bold text-ink-900">Tracking</h2>
            <div className="mt-5 rounded-card border border-ink-200 bg-white p-6">
              <OrderTimeline
                status={order.status}
                createdAt={order.createdAt}
                updatedAt={order.updatedAt}
              />
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
              <Package size={19} className="text-ink-400" />
              Items
            </h2>

            <ul className="mt-5 divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-200 bg-white">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 p-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-ink-300">
                        <Package size={22} />
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      {/* The product may since have been deleted — the snapshot
                          name still renders, just without a link. */}
                      {item.product ? (
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="font-semibold text-ink-900 hover:underline"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <p className="font-semibold text-ink-900">{item.name}</p>
                      )}
                      <p className="mt-1 text-xs text-ink-500">
                        SKU {item.sku}
                      </p>
                      <p className="mt-1 text-sm text-ink-600">
                        {formatPrice(toNumber(item.price))} × {item.quantity}
                      </p>
                    </div>

                    <p className="font-bold tabular-nums text-ink-900">
                      {formatPrice(toNumber(item.price) * item.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-card border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
              Summary
            </h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Subtotal" value={formatPrice(toNumber(order.subtotal))} />
              <Row
                label="Shipping"
                value={
                  toNumber(order.shipping) === 0
                    ? "Free"
                    : formatPrice(toNumber(order.shipping))
                }
              />
              {toNumber(order.discount) > 0 ? (
                <Row
                  label="Discount"
                  value={`−${formatPrice(toNumber(order.discount))}`}
                />
              ) : null}
              {toNumber(order.tax) > 0 ? (
                <Row label="Tax" value={formatPrice(toNumber(order.tax))} />
              ) : null}

              <div className="flex items-center justify-between border-t border-ink-200 pt-3">
                <dt className="font-bold text-ink-900">Total</dt>
                <dd className="text-lg font-extrabold tabular-nums text-ink-900">
                  {formatPrice(toNumber(order.total))}
                </dd>
              </div>
            </dl>
          </section>

          {order.address ? (
            <section className="rounded-card border border-ink-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
                <MapPin size={15} />
                Delivery address
              </h2>

              <address className="mt-3 space-y-0.5 text-sm not-italic text-ink-700">
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
            </section>
          ) : null}

          {order.status === "PENDING" ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
              We&apos;re still waiting for payment confirmation.{" "}
              <Link href="/contact" className="font-semibold underline">
                Contact us
              </Link>{" "}
              if you were charged and this hasn&apos;t updated.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-600">{label}</dt>
      <dd className="tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}
