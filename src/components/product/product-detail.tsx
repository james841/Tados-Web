"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Check,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { useCart } from "@/store/cart";
import { DELIVERY_WINDOW } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button, Price, StarRating, SaleBadge } from "@/components/ui";

interface DetailImage {
  id: string;
  url: string;
  alt: string | null;
}

export interface ProductDetailData {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  brandName: string | null;
  categoryName: string;
  features: string[];
  images: DetailImage[];
}

/**
 * Gallery + buy box. Client component because it owns the selected image,
 * quantity, and the add-to-cart interaction.
 */
export function ProductDetail({ product }: { product: ProductDetailData }) {
  const addItem = useCart((s) => s.addItem);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const current = product.images[activeImage];

  function handleAdd() {
    if (outOfStock) return;
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        sku: product.sku,
        price: product.price,
        image: product.images[0]?.url ?? null,
        stock: product.stock,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      {/* Gallery */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-card bg-ink-50">
          {current ? (
            <Image
              key={activeImage}
              fill
              priority
              src={current.url}
              alt={current.alt ?? product.name}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-opacity duration-200"
            />
          ) : null}

          <div className="absolute left-4 top-4 flex gap-2">
            <SaleBadge
              price={product.price}
              compareAtPrice={product.compareAtPrice}
            />
          </div>
        </div>

        {product.images.length > 1 ? (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {product.images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`View image ${index + 1}`}
                aria-current={index === activeImage}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg border-2 bg-ink-50 transition-colors",
                  index === activeImage
                    ? "border-brand-600"
                    : "border-transparent hover:border-ink-300",
                )}
              >
                <Image
                  fill
                  src={image.url}
                  alt=""
                  sizes="120px"
                  loading="lazy"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Buy box */}
      <div>
        {product.brandName ? (
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            {product.brandName}
          </p>
        ) : null}

        <h1 className="mt-2 text-2xl font-extrabold uppercase leading-tight tracking-tight text-ink-900 sm:text-3xl">
          {product.name}
        </h1>

        <div className="mt-3 flex items-center gap-3">
          <StarRating
            rating={product.ratingAvg}
            count={product.ratingCount}
            size={16}
          />
          <span className="text-xs text-ink-400">SKU {product.sku}</span>
        </div>

        {product.shortDescription ? (
          <p className="mt-5 text-sm leading-relaxed text-ink-600">
            {product.shortDescription}
          </p>
        ) : null}

        <Price
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          size="xl"
          className="mt-6"
        />
        <p className="mt-1 text-xs text-ink-500">No hidden fees</p>

        {/* Key features from the product spec */}
        {product.features.length > 0 ? (
          <div className="mt-7">
            <p className="mb-3 text-base font-bold text-ink-900">Key features</p>
            <ul className="space-y-2">
              {product.features.slice(0, 5).map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-ink-600"
                >
                  <Check
                    size={16}
                    className="mt-0.5 shrink-0 text-brand-600"
                    aria-hidden="true"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Stock + quantity */}
        <div className="mt-7 flex items-center gap-4">
          <div className="flex items-center rounded-full border border-ink-300">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="flex size-10 items-center justify-center rounded-l-full text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-40"
            >
              <Minus size={15} />
            </button>
            <span
              aria-live="polite"
              className="w-10 text-center text-sm font-bold"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.min(product.stock || 1, q + 1))
              }
              disabled={quantity >= product.stock}
              aria-label="Increase quantity"
              className="flex size-10 items-center justify-center rounded-r-full text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-40"
            >
              <Plus size={15} />
            </button>
          </div>

          {outOfStock ? (
            <span className="text-sm font-semibold text-accent-600">
              Out of stock
            </span>
          ) : lowStock ? (
            <span className="text-sm font-semibold text-accent-600">
              Only {product.stock} left
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
              <Check size={15} /> In stock
            </span>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAdd}
            disabled={outOfStock}
          >
            {added ? (
              <>
                <Check size={18} /> Added to cart
              </>
            ) : (
              <>
                <ShoppingBag size={18} /> Add to Cart
              </>
            )}
          </Button>
        </div>

        {/* Reassurance.
            Every claim links to the policy behind it. The previous version
            promised "Free delivery over R1 500 / 2–4 working days" and a flat
            "2-year warranty" — neither of which the Shipping or Warranty policy
            commits to, and the warranty term genuinely varies per product. */}
        <div className="mt-7 grid gap-3 rounded-card bg-ink-50 p-5 sm:grid-cols-3">
          <ReassuranceTile
            href="/shipping"
            icon={<Truck size={18} />}
            title="Nationwide delivery"
            detail={DELIVERY_WINDOW}
          />
          <ReassuranceTile
            href="/warranty"
            icon={<ShieldCheck size={18} />}
            title="Warranty"
            detail="Statutory + manufacturer cover"
          />
          <ReassuranceTile
            href="/returns"
            icon={<RotateCcw size={18} />}
            title="Returns"
            detail="Defective, wrong or damaged"
          />
        </div>

        {/* Full description */}
        <div className="mt-8 border-t border-ink-200 pt-7">
          <h2 className="mb-3 text-lg font-bold text-ink-900">
            About this product
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-ink-600">
            {product.description.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {product.features.length > 5 ? (
            <>
              <h3 className="mb-3 mt-6 text-base font-bold text-ink-900">
                Full feature list
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-ink-600"
                  >
                    <Check
                      size={14}
                      className="mt-1 shrink-0 text-brand-600"
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** One tile in the reassurance strip, linked to the policy that backs it. */
function ReassuranceTile({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link href={href} className="group flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-brand-600">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-ink-900 group-hover:text-brand-700">
          {title}
        </span>
        <span className="block text-xs text-ink-500">{detail}</span>
      </span>
    </Link>
  );
}
