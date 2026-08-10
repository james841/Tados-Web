"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { cn, formatPrice } from "@/lib/utils";
import { selectCartSubtotal, useCart, type CartItem } from "@/store/cart";

/**
 * Slide-over cart ("Your Bag").
 *
 * Mounted once in the root layout and driven entirely by the `isOpen` flag on
 * the cart store, so anything can open it — `addItem` flips the flag itself,
 * which is what makes "add to cart" feel immediate from a product card.
 *
 * Accessibility notes:
 *  - The panel is a modal dialog: focus moves in on open, is trapped inside
 *    while it is up, and returns to the trigger on close.
 *  - Escape closes, as does the backdrop.
 *  - Background scrolling is locked, otherwise the page behind the panel
 *    scrolls on wheel/touch.
 *
 * Quantities are clamped to available stock by the store, so the stepper only
 * has to render the limit rather than enforce it.
 */
export function CartDrawer() {
  const items = useCart((s) => s.items);
  const isOpen = useCart((s) => s.isOpen);
  const closeCart = useCart((s) => s.closeCart);
  const subtotal = useCart(selectCartSubtotal);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  /** Whatever had focus before opening, so we can hand it back. */
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - subtotal,
  );

  // Lock background scroll while the panel is up. Restoring the previous value
  // rather than clearing it avoids fighting any other scroll lock.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Remember the trigger, move focus into the panel, and restore it on close.
  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      // Wait a frame so the panel is mounted and focusable.
      const frame = requestAnimationFrame(() => closeRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }

    returnFocusRef.current?.focus?.();
  }, [isOpen]);

  // Escape to close, Tab cycled inside the panel — a bare slide-over would
  // otherwise let focus wander into the page behind it.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCart();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeCart]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            className="absolute inset-0 bg-ink-950/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCart}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-start justify-between gap-4 px-5 pt-6">
              <h2
                id="cart-drawer-title"
                className="text-xl font-bold tracking-tight text-ink-900"
              >
                Your Bag{" "}
                <sup className="text-xs font-semibold text-ink-500">
                  ({count})
                </sup>
              </h2>

              <button
                ref={closeRef}
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-colors hover:bg-ink-200 hover:text-ink-900"
              >
                <X size={16} />
              </button>
            </header>

            {items.length === 0 ? (
              <EmptyBag onClose={closeCart} />
            ) : (
              <>
                <div className="mt-5 flex-1 overflow-y-auto px-5">
                  <ul className="divide-y divide-ink-200">
                    {items.map((item) => (
                      <CartRow key={item.productId} item={item} />
                    ))}
                  </ul>
                </div>

                <CartFooter
                  subtotal={subtotal}
                  remainingForFreeShipping={remainingForFreeShipping}
                  note={note}
                  noteOpen={noteOpen}
                  onNoteChange={setNote}
                  onToggleNote={() => setNoteOpen((open) => !open)}
                  onNavigate={closeCart}
                />
              </>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/** One line item: thumbnail, name, unit price, stepper, remove. */
function CartRow({ item }: { item: CartItem }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);

  const atStockLimit = item.quantity >= item.stock;

  return (
    <li className="flex gap-4 py-5">
      <Link
        href={`/products/${item.slug}`}
        className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-ink-100"
        tabIndex={-1}
        aria-hidden="true"
      >
        {item.image ? (
          <Image
            src={item.image}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-ink-300">
            <ShoppingBag size={22} />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/products/${item.slug}`}
          className="text-sm font-medium leading-snug text-ink-900 hover:text-brand-700"
        >
          {item.name}
        </Link>

        <p className="mt-1 text-sm font-bold text-ink-900">
          {formatPrice(item.price)}
        </p>
        <p className="mt-0.5 text-xs text-ink-500">SKU · {item.sku}</p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center rounded-lg border border-ink-200">
            <StepperButton
              label={`Decrease quantity of ${item.name}`}
              onClick={() => setQuantity(item.productId, item.quantity - 1)}
            >
              <Minus size={14} />
            </StepperButton>

            {/* aria-live so screen readers hear the new count after a step. */}
            <span
              aria-live="polite"
              className="w-10 text-center text-sm font-semibold tabular-nums text-ink-900"
            >
              {String(item.quantity).padStart(2, "0")}
            </span>

            <StepperButton
              label={`Increase quantity of ${item.name}`}
              onClick={() => setQuantity(item.productId, item.quantity + 1)}
              disabled={atStockLimit}
            >
              <Plus size={14} />
            </StepperButton>
          </div>

          <button
            type="button"
            onClick={() => removeItem(item.productId)}
            aria-label={`Remove ${item.name} from cart`}
            className="flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {atStockLimit ? (
          <p className="mt-2 text-xs font-medium text-amber-700">
            Only {item.stock} left in stock
          </p>
        ) : null}
      </div>
    </li>
  );
}

function StepperButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center text-ink-600 transition-colors hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function CartFooter({
  subtotal,
  remainingForFreeShipping,
  note,
  noteOpen,
  onNoteChange,
  onToggleNote,
  onNavigate,
}: {
  subtotal: number;
  remainingForFreeShipping: number;
  note: string;
  noteOpen: boolean;
  onNoteChange: (value: string) => void;
  onToggleNote: () => void;
  onNavigate: () => void;
}) {
  const qualifies = remainingForFreeShipping <= 0;
  const progress = Math.min(
    100,
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100,
  );

  return (
    <div className="border-t border-ink-200 px-5 py-5">
      {/* Free-shipping nudge — the single most effective place for it. */}
      <div className="mb-4">
        <p className="flex items-center gap-2 text-xs text-ink-600">
          <Truck size={14} className="shrink-0 text-ink-400" />
          {qualifies ? (
            <span className="font-medium text-green-700">
              Your order ships free
            </span>
          ) : (
            <span>
              Add{" "}
              <strong className="text-ink-900">
                {formatPrice(remainingForFreeShipping)}
              </strong>{" "}
              more for free shipping
            </span>
          )}
        </p>

        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-ink-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Progress toward free shipping"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              qualifies ? "bg-green-600" : "bg-brand-600",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-bold text-ink-900">Total</p>
          <p className="mt-0.5 text-xs text-ink-500">
            Tax included. Shipping calculated at checkout.
          </p>
        </div>
        <p className="text-lg font-bold tabular-nums text-ink-900">
          {formatPrice(subtotal)}
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleNote}
        aria-expanded={noteOpen}
        className="mt-3 text-xs font-medium text-ink-600 underline underline-offset-2 transition-colors hover:text-ink-900"
      >
        {noteOpen ? "Hide order note" : "Add order note"}
      </button>

      {noteOpen ? (
        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Delivery instructions, gift message…"
          aria-label="Order note"
          className="mt-2 w-full resize-none rounded-lg border border-ink-200 p-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900"
        />
      ) : null}

      <div className="mt-4 space-y-2">
        <ButtonLink
          href="/checkout"
          variant="dark"
          onClick={onNavigate}
          className="w-full justify-center"
        >
          Checkout
        </ButtonLink>

        <ButtonLink
          href="/cart"
          variant="outline"
          onClick={onNavigate}
          className="w-full justify-center"
        >
          View cart
        </ButtonLink>
      </div>
    </div>
  );
}

function EmptyBag({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        <ShoppingBag size={26} />
      </span>

      <p className="mt-4 text-base font-semibold text-ink-900">
        Your bag is empty
      </p>
      <p className="mt-1 text-sm text-ink-500">
        Browse the catalogue and add something you like.
      </p>

      <ButtonLink href="/products" onClick={onClose} className="mt-6">
        Start shopping
      </ButtonLink>
    </div>
  );
}
