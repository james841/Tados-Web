"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Check } from "lucide-react";
import { useState, useTransition } from "react";

import type { ProductCardData } from "@/lib/queries";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { Badge, Price, StarRating, SaleBadge } from "@/components/ui";

/**
 * Product card matching the reference UI: image on top with corner badges and
 * a floating bag button, then category / name / price / rating beneath.
 *
 * `priority` should be true only for above-the-fold cards so the LCP image
 * is preloaded and everything else stays lazy.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardData;
  priority?: boolean;
  className?: string;
}) {
  const addItem = useCart((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const [, startTransition] = useTransition();

  const outOfStock = product.stock <= 0;

  function handleAdd(event: React.MouseEvent) {
    // The whole card is a link — don't navigate when hitting the bag.
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
        "group relative flex flex-col overflow-hidden rounded-card border border-ink-200 bg-white transition-shadow duration-200 hover:shadow-lift",
        className,
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-square overflow-hidden bg-ink-50"
      >
        {product.image ? (
          <Image
            fill
            src={product.image}
            alt={product.imageAlt ?? product.name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-400">
            Image coming soon
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.isNewArrival ? <Badge tone="new">New</Badge> : null}
          {product.isBestseller && !product.isNewArrival ? (
            <Badge tone="best">Best</Badge>
          ) : null}
          <SaleBadge
            price={product.price}
            compareAtPrice={product.compareAtPrice}
          />
        </div>

        {outOfStock ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Badge tone="muted">Out of stock</Badge>
          </div>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
          {product.categoryName}
        </p>

        <h3 className="line-clamp-2-fixed min-h-10 text-sm font-semibold leading-5 text-ink-900">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>

        <StarRating
          rating={product.ratingAvg}
          count={product.ratingCount}
          size={12}
        />

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} />

          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={`Add ${product.name} to cart`}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
              added
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 text-ink-700 hover:border-ink-900 hover:bg-ink-900 hover:text-white",
              outOfStock && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
          >
            {added ? <Check size={16} /> : <ShoppingBag size={16} />}
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
      className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5", className)}
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
