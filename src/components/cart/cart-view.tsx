"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { useCart, selectCartCount, selectCartSubtotal } from "@/store/cart";
import { ButtonLink, EmptyState, Price } from "@/components/ui";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from "@/lib/constants";

/**
 * Cart view with inline quantity controls and a "Clear cart" button that
 * requires sign-in (per your brief).
 */
export function CartView() {
  const { data: session } = useSession();
  const cart = useCart();
  const count = useCart(selectCartCount);
  const subtotal = useCart(selectCartSubtotal);

  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const total = subtotal + shipping;

  function handleClearCart() {
    if (!session?.user) {
      setShowSignInPrompt(true);
      return;
    }
    if (confirm("Remove all items from your cart?")) {
      cart.clear();
      setShowSignInPrompt(false);
    }
  }

  if (count === 0) {
    return (
      <div className="mt-12">
        <EmptyState
          icon={<ShoppingBag size={40} />}
          title="Your cart is empty"
          description="Add some products to get started."
          action={
            <ButtonLink href="/products" variant="primary">
              Browse products
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <div className="mb-4 flex items-center justify-between border-b border-ink-200 pb-3">
          <p className="text-sm font-medium text-ink-500">
            {count} {count === 1 ? "item" : "items"}
          </p>
          <button
            type="button"
            onClick={handleClearCart}
            className="text-sm font-semibold text-red-600 hover:underline"
          >
            Clear cart
          </button>
        </div>

        {showSignInPrompt && !session?.user ? (
          <div className="mb-4 rounded-lg bg-amber-50 p-4 text-sm ring-1 ring-amber-600/20">
            <p className="font-semibold text-amber-900">Sign in required</p>
            <p className="mt-1 text-amber-700">
              You need to{" "}
              <Link
                href="/login?callbackUrl=/cart"
                className="font-semibold underline"
              >
                sign in
              </Link>{" "}
              to clear your cart.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          {cart.items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-4 rounded-card border border-ink-200 bg-white p-4"
            >
              <Link
                href={`/products/${item.slug}`}
                className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-ink-100"
              >
                {item.image ? (
                  <Image
                    fill
                    src={item.image}
                    alt={item.name}
                    sizes="96px"
                    className="object-cover"
                  />
                ) : null}
              </Link>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-500">SKU: {item.sku}</p>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        cart.setQuantity(item.productId, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-700 hover:border-ink-900 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        cart.setQuantity(item.productId, item.quantity + 1)
                      }
                      disabled={item.quantity >= item.stock}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-700 hover:border-ink-900 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => cart.removeItem(item.productId)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    aria-label="Remove from cart"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between">
                <Price price={item.price * item.quantity} className="text-lg" />
                {item.quantity > 1 ? (
                  <p className="text-xs text-ink-500">
                    <Price price={item.price} /> each
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-card border border-ink-200 bg-white p-6">
          <h2 className="text-lg font-bold text-ink-900">Order Summary</h2>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-600">Subtotal</span>
              <Price price={subtotal} />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-600">Shipping</span>
              {shipping === 0 ? (
                <span className="font-semibold text-brand-700">Free</span>
              ) : (
                <Price price={shipping} />
              )}
            </div>
          </div>

          {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
              Add <Price price={FREE_SHIPPING_THRESHOLD - subtotal} /> more for
              free shipping
            </p>
          ) : null}

          <div className="mt-4 border-t border-ink-200 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-ink-900">Total</span>
              <Price price={total} className="text-2xl font-bold" />
            </div>
          </div>

          <ButtonLink
            href="/checkout"
            variant="primary"
            size="lg"
            className="mt-6 w-full"
          >
            Proceed to Checkout
          </ButtonLink>

          <Link
            href="/products"
            className="mt-3 block text-center text-sm font-semibold text-brand-700 hover:underline"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
