import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Package } from "lucide-react";

import { ClearCartOnMount } from "@/components/checkout/clear-cart-on-mount";
import { ButtonLink, EmptyState } from "@/components/ui";
import { devConfirmOrder, devSettlementAllowed } from "@/lib/dev-settle";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice, toNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

// Order state changes the moment the ITN lands, so this can never be cached.
export const dynamic = "force-dynamic";

/**
 * Payment return page.
 *
 * The customer's browser arriving here is not proof of payment — the ITN at
 * /api/payfast/notify is. So this page reports whatever state the order is
 * actually in, and says "processing" rather than "paid" when the callback
 * hasn't arrived yet.
 *
 * On a dev machine PayFast cannot reach localhost, so `devConfirmOrder` settles
 * the order here instead. That helper is hard-gated to development + sandbox.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;

  if (!orderNumber) return <MissingOrder />;

  // Dev-only: settle before reading, so the page reflects the new state.
  if (devSettlementAllowed()) {
    await devConfirmOrder(orderNumber);
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      email: true,
      status: true,
      subtotal: true,
      shipping: true,
      total: true,
      createdAt: true,
      items: {
        select: { id: true, name: true, quantity: true, price: true },
      },
      address: {
        select: {
          firstName: true,
          lastName: true,
          line1: true,
          line2: true,
          city: true,
          province: true,
          postalCode: true,
        },
      },
      payment: { select: { status: true } },
    },
  });

  if (!order) return <MissingOrder />;

  const paid = order.payment?.status === "COMPLETE";
  const cancelled = order.status === "CANCELLED";

  return (
    <div className="container-page max-w-3xl py-12">
      {/* Only wipe the cart once the money is actually in. */}
      <ClearCartOnMount enabled={paid} />

      <div className="text-center">
        <span
          className={
            paid
              ? "inline-flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600"
              : "inline-flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600"
          }
        >
          {paid ? <CheckCircle2 size={32} /> : <Clock size={32} />}
        </span>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-900">
          {paid
            ? "Thank you — your order is confirmed"
            : cancelled
              ? "This order was cancelled"
              : "We're confirming your payment"}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-600">
          {paid ? (
            <>
              We&apos;ve emailed a confirmation to{" "}
              <strong className="text-ink-900">{order.email}</strong>. Your order
              will be packed and dispatched within 1–2 working days.
            </>
          ) : cancelled ? (
            <>
              The payment didn&apos;t go through and the items have been returned
              to stock. Nothing was charged.
            </>
          ) : (
            <>
              PayFast is still confirming this payment. This usually takes a few
              seconds — refresh in a moment. You&apos;ll get an email as soon as
              it clears.
            </>
          )}
        </p>

        <p className="mt-4 inline-block rounded-lg bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-900">
          Order {order.orderNumber}
        </p>
      </div>

      <div className="mt-10 rounded-card border border-ink-200 bg-white p-6">
        <div className="flex items-center gap-2 border-b border-ink-200 pb-4">
          <Package size={18} className="text-ink-400" />
          <h2 className="font-bold text-ink-900">Order details</h2>
          <span className="ml-auto text-xs text-ink-500">
            {formatDate(order.createdAt)}
          </span>
        </div>

        <ul className="divide-y divide-ink-100">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink-900">
                  {item.name}
                </span>
                <span className="text-xs text-ink-500">
                  Qty {item.quantity}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink-900">
                {formatPrice(toNumber(item.price) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm">
          <Row label="Subtotal" value={formatPrice(toNumber(order.subtotal))} />
          <Row
            label="Shipping"
            value={
              toNumber(order.shipping) === 0
                ? "Free"
                : formatPrice(toNumber(order.shipping))
            }
          />
          <div className="flex justify-between border-t border-ink-200 pt-2 text-base">
            <span className="font-bold text-ink-900">Total</span>
            <span className="font-bold tabular-nums text-ink-900">
              {formatPrice(toNumber(order.total))}
            </span>
          </div>
        </div>

        {order.address ? (
          <div className="mt-6 border-t border-ink-200 pt-4 text-sm">
            <p className="font-semibold text-ink-900">Shipping to</p>
            <p className="mt-1 text-ink-600">
              {order.address.firstName} {order.address.lastName}
              <br />
              {order.address.line1}
              {order.address.line2 ? (
                <>
                  <br />
                  {order.address.line2}
                </>
              ) : null}
              <br />
              {order.address.city}, {order.address.province}{" "}
              {order.address.postalCode}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/account" variant="dark">
          View my orders
        </ButtonLink>
        <ButtonLink href="/products" variant="outline">
          Continue shopping
        </ButtonLink>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-600">{label}</span>
      <span className="tabular-nums text-ink-900">{value}</span>
    </div>
  );
}

function MissingOrder() {
  return (
    <div className="container-page max-w-2xl py-16">
      <EmptyState
        title="We couldn't find that order"
        description="The link may be incomplete. If you've just paid, check your email for the confirmation."
        action={
          <ButtonLink href="/products" variant="primary">
            Browse products
          </ButtonLink>
        }
      />
      <p className="mt-6 text-center text-sm text-ink-500">
        Need help?{" "}
        <Link
          href="/contact"
          className="font-semibold text-brand-700 hover:underline"
        >
          Contact support
        </Link>
      </p>
    </div>
  );
}
