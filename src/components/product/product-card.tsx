"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Check } from "lucide-react";
import { useState, useTransition } from "react";

import type { ProductCardData } from "@/lib/queries";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { Badge, Price, StarRating, SaleBadge } from "@/components/ui";

export function ProductCard({
  product,
  priority = false,
  focusable = true,
  onFocus,
  className,
}: {
  product: ProductCardData;
  priority?: boolean;
  focusable?: boolean;
  onFocus?: () => void;
  className?: string;
}) {
  const addItem = useCart((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const [, startTransition] = useTransition();

  const outOfStock = product.stock <= 0;
  const tabIndex = focusable ? undefined : -1;

  function handleAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (outOfStock) return;

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.slug,
      price: product.price,
      image: product.image,
      stock: product.stock,
    });

    setAdded(true);
    startTransition(() => {
      setTimeout(() => setAdded(false), 1600);
    });
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300",
        // Enhanced base border: darker, crisper contrast with a subtle outline ring
        "border border-ink-300 shadow-sm ring-1 ring-black/[0.03]",
        // Hover dynamics: stronger border, subtle lift, refined shadow focus
        "hover:-translate-y-1 hover:border-ink-600 hover:ring-ink-600/10 hover:shadow-xl hover:shadow-ink-900/10",
        className,
      )}
    >
      {/* Image Container with Zoom & Badge Floating Overlay */}
      <Link
        href={`/products/${product.slug}`}
        tabIndex={tabIndex}
        onFocus={onFocus}
        /* Square on a phone too, rather than the 4:3 it used to be. Two cards to
           a row leaves each one about 170px wide, and a 4:3 window cropped the
           top and bottom off products that are mostly tall — locks, padlocks,
           alarm panels. Squaring it adds roughly 40px of card height and shows
           the whole device. */
        className="relative aspect-square overflow-hidden border-b border-ink-100/80 bg-ink-50/70"
      >
        {product.image ? (
          <Image
            fill
            src={product.image}
            alt={product.imageAlt ?? product.name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-ink-400">
            Image coming soon
          </div>
        )}

        {/* Floating Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 pointer-events-none drop-shadow-sm">
          {product.isNewArrival ? <Badge tone="new">New</Badge> : null}
          <SaleBadge
            price={product.price}
            compareAtPrice={product.compareAtPrice}
          />
        </div>

        {/* Out of stock Overlay with Backdrop Blur */}
        {outOfStock ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/85 backdrop-blur-md">
            <Badge tone="muted" className="scale-105 font-medium shadow-sm border border-ink-200">
              Out of stock
            </Badge>
          </div>
        ) : null}
      </Link>

      {/* Details Container */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Category & Title */}
        <div className="flex-1">
          <p className="text-[10px] font-bold tracking-widest uppercase text-ink-400">
            {product.categoryName}
          </p>

          <h3 className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold tracking-tight text-ink-900 transition-colors group-hover:text-ink-600">
            <Link
              href={`/products/${product.slug}`}
              tabIndex={tabIndex}
              onFocus={onFocus}
            >
              {product.name}
            </Link>
          </h3>
        </div>

        {/* Star Rating */}
        <div className="mt-2.5">
          <StarRating
            rating={product.ratingAvg}
            count={product.ratingCount}
            size={13}
          />
        </div>

        {/* Price & Action Button */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-3.5">
          <div className="flex flex-col">
            <Price price={product.price} compareAtPrice={product.compareAtPrice} />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            tabIndex={tabIndex}
            onFocus={onFocus}
            aria-label={`Add ${product.name} to cart`}
            className={cn(
              "relative flex size-10 shrink-0 items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2",
              added
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-105"
                : "bg-ink-900 text-white hover:bg-ink-800 hover:shadow-lg hover:shadow-ink-900/15",
              outOfStock && "cursor-not-allowed bg-ink-100 text-ink-400 hover:bg-ink-100 hover:shadow-none active:scale-100",
            )}
          >
            {added ? (
              <Check size={18} className="animate-in zoom-in-50 duration-200" />
            ) : (
              <ShoppingBag size={18} className="transition-transform duration-200 group-hover:scale-110" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  priorityCount = 4,
  className,
}: {
  products: ProductCardData[];
  priorityCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4",
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}