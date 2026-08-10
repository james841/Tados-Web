"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useAnimationControls } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";

import { resolveCategoryIcon } from "@/lib/category-icons";
import type { FeaturedCategory } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Auto-advancing category rail.
 *
 * One row, every category side by side, stepping right-to-left every 6 seconds
 * and looping forever. Each card links to `/category/[slug]` — the same
 * destination as the header dropdown — so the rail is a visual shortcut into
 * the identical catalogue pages.
 *
 * How the infinite loop works
 * ---------------------------
 * The track renders the list more than once and never reorders, so React keys
 * stay stable and cards are never remounted. `offset` is the index of the
 * leftmost *real* card and the track is translated by `-offset * step`.
 *
 * Movement is driven imperatively through animation controls rather than an
 * `animate` prop. That matters for the wrap: advancing off the last card
 * animates to `-count * step`, which is the start of the duplicate copy and
 * therefore pixel-identical to `-0 * step`. Once that animation has resolved we
 * snap the transform back to 0 in the same frame. Awaiting the animation keeps
 * the snap strictly ordered after the movement, so there is no race between a
 * completion callback and a state update.
 *
 * `step` is measured from a rendered card rather than calculated, so the
 * responsive Tailwind widths below stay the single source of truth for layout.
 */

/** How long each card sits still before the rail advances, in milliseconds. */
const SLIDE_INTERVAL = 6000;

/** Length of the slide itself, in seconds. */
const SLIDE_DURATION = 0.85;

/** Must match the `gap-4` on the track (1rem at the default root size). */
const GAP = 16;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function CategoryCarousel({
  categories,
  className,
}: {
  categories: FeaturedCategory[];
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLLIElement>(null);
  /** Guards against overlapping slides from a fast clicker or a stray timer. */
  const movingRef = useRef(false);
  const controls = useAnimationControls();

  const [{ step, perView }, setMetrics] = useState({ step: 0, perView: 1 });
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = categories.length;

  // Enough copies that the row is always full — including the moment the track
  // sits one full list to the left, mid-wrap.
  const track = useMemo(() => {
    if (count === 0) return [];
    const needed = count + perView + 1;
    const copies = Math.max(2, Math.ceil(needed / count));
    return Array.from({ length: copies }, () => categories).flat();
  }, [categories, count, perView]);

  // Measure a real card so the translate step always matches what's rendered.
  useEffect(() => {
    const viewport = viewportRef.current;
    const card = cardRef.current;
    if (!viewport || !card) return;

    const measure = () => {
      const cardWidth = card.getBoundingClientRect().width;
      const viewportWidth = viewport.getBoundingClientRect().width;
      if (cardWidth === 0) return;

      const nextStep = cardWidth + GAP;
      setMetrics({
        step: nextStep,
        perView: Math.max(1, Math.round((viewportWidth + GAP) / nextStep)),
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [count]);

  // Re-sync the transform after a resize changes the step, without animating.
  useEffect(() => {
    controls.set({ x: -offset * step });
    // `offset` is deliberately omitted: this is only a correction for new
    // measurements. Offset changes animate through the helpers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, step]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const goNext = useCallback(async () => {
    if (movingRef.current || step <= 0 || count < 2) return;
    movingRef.current = true;

    try {
      const next = offset + 1;
      await controls.start(
        { x: -next * step },
        { duration: SLIDE_DURATION, ease: EASE },
      );

      if (next >= count) {
        // Standing on the duplicate copy — rewind to the original invisibly.
        controls.set({ x: 0 });
        setOffset(0);
      } else {
        setOffset(next);
      }
    } finally {
      movingRef.current = false;
    }
  }, [controls, count, offset, step]);

  const goPrev = useCallback(async () => {
    if (movingRef.current || step <= 0 || count < 2) return;
    movingRef.current = true;

    try {
      // From the first card, jump to the identical-looking duplicate position
      // first, so the slide back still travels right-to-left on screen.
      if (offset === 0) controls.set({ x: -count * step });

      const from = offset === 0 ? count : offset;
      await controls.start(
        { x: -(from - 1) * step },
        { duration: SLIDE_DURATION, ease: EASE },
      );
      setOffset(from - 1);
    } finally {
      movingRef.current = false;
    }
  }, [controls, count, offset, step]);

  const goTo = useCallback(
    async (target: number) => {
      if (movingRef.current || step <= 0 || target === offset) return;
      movingRef.current = true;

      try {
        await controls.start(
          { x: -target * step },
          { duration: SLIDE_DURATION, ease: EASE },
        );
        setOffset(target);
      } finally {
        movingRef.current = false;
      }
    },
    [controls, offset, step],
  );

  const autoplay = !paused && !reducedMotion && count > 1 && step > 0;

  // Keyed on `offset`, so every advance — manual or automatic — restarts the
  // full 6-second dwell rather than cutting the next one short.
  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(goNext, SLIDE_INTERVAL);
    return () => clearTimeout(timer);
  }, [autoplay, goNext, offset]);

  if (count === 0) return null;

  return (
    <section
      aria-labelledby="popular-categories"
      aria-roledescription="carousel"
      className={cn("container-page py-12 sm:py-16", className)}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <h2
            id="popular-categories"
            className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
          >
            Most Popular Categories
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
            Every category opens the products inside it.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="group hidden items-center gap-1.5 text-sm font-semibold text-ink-700 transition-colors hover:text-brand-700 sm:inline-flex"
          >
            Browse all products
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <RailButton label="Previous categories" onClick={goPrev}>
              <ChevronLeft size={18} />
            </RailButton>

            <RailButton
              label={
                paused ? "Resume category slideshow" : "Pause category slideshow"
              }
              onClick={() => setPaused((p) => !p)}
              pressed={paused}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </RailButton>

            <RailButton label="Next categories" onClick={goNext}>
              <ChevronRight size={18} />
            </RailButton>
          </div>
        </div>
      </div>

      {/* Autoplay pauses on hover and while focus is inside — WCAG 2.2.2. */}
      <div
        ref={viewportRef}
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <motion.ul
          className="flex w-full gap-4"
          animate={controls}
          initial={{ x: 0 }}
        >
          {track.map((category, position) => {
            // Only the first pass is real; the rest exist to fill the loop.
            const isClone = position >= count;

            return (
              <li
                key={`${category.id}-${position}`}
                ref={position === 0 ? cardRef : undefined}
                aria-hidden={isClone || undefined}
                className={cn(
                  "shrink-0",
                  "basis-[calc((100%-1rem)/2)]",
                  "sm:basis-[calc((100%-2rem)/3)]",
                  "md:basis-[calc((100%-3rem)/4)]",
                  "lg:basis-[calc((100%-4rem)/5)]",
                  "xl:basis-[calc((100%-5rem)/6)]",
                )}
              >
                <CategoryCard
                  category={category}
                  eager={position < 6}
                  focusable={!isClone}
                  onFocus={
                    isClone
                      ? undefined
                      : () => {
                          // Keep a keyboard-focused card on screen.
                          const visible =
                            position >= offset && position < offset + perView;
                          if (!visible) void goTo(position);
                        }
                  }
                />
              </li>
            );
          })}
        </motion.ul>
      </div>

      <div className="mt-6 flex justify-center gap-1.5">
        {categories.map((category, dot) => (
          <button
            key={category.id}
            type="button"
            onClick={() => void goTo(dot)}
            aria-label={`Show ${category.name}`}
            aria-current={dot === offset}
            className={cn(
              "h-1.5 rounded-full transition-all",
              dot === offset
                ? "w-6 bg-ink-900"
                : "w-1.5 bg-ink-300 hover:bg-ink-400",
            )}
          />
        ))}
      </div>
    </section>
  );
}

function RailButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="flex size-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition-colors hover:border-ink-900 hover:bg-ink-900 hover:text-white"
    >
      {children}
    </button>
  );
}

function CategoryCard({
  category,
  eager,
  focusable,
  onFocus,
}: {
  category: FeaturedCategory;
  eager: boolean;
  focusable: boolean;
  onFocus?: () => void;
}) {
  // Category imagery is optional, and the seed references files that may not be
  // in /public yet — fall back to an icon tile instead of a broken image.
  const [imageFailed, setImageFailed] = useState(false);

  const Icon = resolveCategoryIcon(category.icon);
  const showImage = Boolean(category.image) && !imageFailed;

  return (
    <Link
      href={`/category/${category.slug}`}
      onFocus={onFocus}
      tabIndex={focusable ? undefined : -1}
      className="group relative block aspect-3/4 overflow-hidden rounded-card bg-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      {showImage ? (
        <Image
          fill
          // Decorative: the visible name below already labels the link.
          alt=""
          src={category.image as string}
          sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 23vw, (max-width: 1280px) 19vw, 16vw"
          loading={eager ? "eager" : "lazy"}
          onError={() => setImageFailed(true)}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-950"
        >
          <Icon size={40} strokeWidth={1.25} className="text-white/25" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
        <div className="flex items-start gap-2">
          <Icon
            size={15}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-brand-400"
          />
          <h3 className="text-sm font-semibold leading-tight text-white">
            {category.name}
          </h3>
        </div>
        <p className="mt-1 pl-[23px] text-[11px] text-white/60">
          {category.productCount}{" "}
          {category.productCount === 1 ? "product" : "products"}
        </p>
      </div>
    </Link>
  );
}

/** Suspense fallback that reserves the same height, so CLS stays at zero. */
export function CategoryCarouselSkeleton() {
  return (
    <section className="container-page py-12 sm:py-16">
      <div className="mb-6 sm:mb-8">
        <div className="skeleton h-8 w-72 rounded" />
        <div className="skeleton mt-2 h-4 w-96 rounded" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] md:basis-[calc((100%-3rem)/4)] lg:basis-[calc((100%-4rem)/5)] xl:basis-[calc((100%-5rem)/6)]"
          >
            <div className="skeleton aspect-3/4 w-full rounded-card" />
          </div>
        ))}
      </div>
    </section>
  );
}
