import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Package, ShoppingBag } from "lucide-react";

import { ButtonLink, EmptyState } from "@/components/ui";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, formatDate, formatPrice, toNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

// Order status changes outside this page's control, so never cache it.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/account");

  // Match on userId *or* email: an order placed as a guest before signing up
  // still belongs to this person, and the email is the only link back to it.
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { userId: user.id },
        ...(user.email ? [{ email: user.email }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      items: {
        select: { id: true, name: true, quantity: true },
      },
    },
  });

  return (
    <div className="container-page max-w-4xl py-10">
      <header className="border-b border-ink-200 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">
          My account
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Signed in as{" "}
          <strong className="font-semibold text-ink-900">{user.email}</strong>
        </p>
      </header>

      <section id="orders" className="scroll-mt-24 pt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <Package size={19} className="text-ink-400" />
          Order history
        </h2>

        {orders.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={<ShoppingBag size={28} />}
              title="No orders yet"
              description="When you place an order it'll show up here with its live status."
              action={
                <ButtonLink href="/products" variant="primary">
                  Start shopping
                </ButtonLink>
              }
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {orders.map((order) => {
              const itemCount = order.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );

              return (
                <li
                  key={order.id}
                  className="rounded-card border border-ink-200 bg-white transition-colors hover:border-ink-300"
                >
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="block p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900">
                          {order.orderNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {formatDate(order.createdAt)} · {itemCount}{" "}
                          {itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                            ORDER_STATUS_STYLES[order.status] ??
                              "bg-ink-100 text-ink-700 ring-ink-600/20",
                          )}
                        >
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                        <span className="font-bold tabular-nums text-ink-900">
                          {formatPrice(toNumber(order.total))}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 truncate text-sm text-ink-600">
                      {order.items.map((item) => item.name).join(", ")}
                    </p>

                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                      View details &amp; tracking
                      <ChevronRight size={15} />
                    </span>
                  </Link>

                  {order.status === "PENDING" ? (
                    <p className="mx-5 mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Awaiting payment confirmation.{" "}
                      <Link href="/contact" className="font-semibold underline">
                        Contact us
                      </Link>{" "}
                      if you were charged and this hasn&apos;t updated.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
