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
        "group relative flex flex-col overflow-hidden rounded-2xl border border-ink-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-ink-400 hover:shadow-xl hover:shadow-ink-900/5",
        className,
      )}
    >
      {/* Image Container with Zoom & Badge Floating Overlay */}
      <Link
        href={`/products/${product.slug}`}
        tabIndex={tabIndex}
        onFocus={onFocus}
        className="relative aspect-[4/3] sm:aspect-square overflow-hidden bg-ink-50/50"
      >
        {product.image ? (
          <Image
            fill
            src={product.image}
            alt={product.imageAlt ?? product.name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-ink-400">
            Image coming soon
          </div>
        )}

        {/* Floating Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 pointer-events-none">
          {product.isNewArrival ? <Badge tone="new">New</Badge> : null}
          <SaleBadge
            price={product.price}
            compareAtPrice={product.compareAtPrice}
          />
        </div>

        {/* Out of stock Overlay with Backdrop Blur */}
        {outOfStock ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <Badge tone="muted" className="scale-105 font-medium shadow-sm">
              Out of stock
            </Badge>
          </div>
        ) : null}
      </Link>

      {/* Details Container */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Category & Title */}
        <div className="flex-1">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-ink-400">
            {product.categoryName}
          </p>

          <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold tracking-tight text-ink-900 group-hover:text-ink-600 transition-colors">
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
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100/80 pt-3">
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
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-105"
                : "bg-ink-900 text-white hover:bg-ink-800 hover:shadow-md hover:shadow-ink-900/10",
              outOfStock && "cursor-not-allowed bg-ink-100 text-ink-400 hover:bg-ink-100 hover:shadow-none active:scale-100",
            )}
          >
            {added ? (
              <Check size={18} className="animate-in zoom-in-50 duration-200" />
            ) : (
              <ShoppingBag size={18} className="transition-transform group-hover/btn:scale-110" />
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