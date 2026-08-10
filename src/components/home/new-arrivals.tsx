"use client";

import { motion, useAnimationControls } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProductCard } from "@/components/product/product-card";
import type { ProductCardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * "New Arrival Products" rail — the freshest stock, newest first.
 *
 * Mechanically this is the same auto-advancing rail as the category carousel
 * on this page: one row of cards stepping right-to-left every few seconds and
 * looping forever. The loop is faked by rendering the list more than once and
 * never reordering it, so React keys stay stable and cards are never
 * remounted. `offset` is the index of the leftmost *real* card and the track is
 * translated by `-offset * step`.
 *
 * Movement runs through imperative animation controls rather than an `animate`
 * prop, which is what makes the wrap invisible: advancing off the last card
 * animates to `-count * step` — the start of the duplicate copy, pixel
 * identical to `-0 * step` — and once that animation has resolved the
 * transform is snapped back to 0 in the same frame. Awaiting the animation
 * keeps the snap strictly ordered after the movement.
 *
 * `step` is measured from a rendered card rather than calculated, so the
 * responsive Tailwind widths below stay the single source of truth for layout.
 *
 * The category filters narrow the same fetched payload on the client — no
 * refetch, no layout jump — and are derived from the products themselves, so a
 * filter can never lead to an empty rail.
 */

/** How long each card sits still before the rail advances, in milliseconds. */
const SLIDE_INTERVAL = 6000;

/** Length of the slide itself, in seconds. */
const SLIDE_DURATION = 0.85;

/** Must match the `gap-4` on the track (1rem at the default root size). */
const GAP = 16;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const ALL_TAB = "all";

export function NewArrivalsCarousel({
  products,
  className,
}: {
  products: ProductCardData[];
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
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);

  // Filters come from the arrivals themselves — first appearance wins, which
  // keeps the order matching the "newest first" sort of the query.
  const tabs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const product of products) {
      if (!seen.has(product.categorySlug)) {
        seen.set(product.categorySlug, product.categoryName);
      }
    }
    return [
      { slug: ALL_TAB, label: "All Products" },
      ...Array.from(seen, ([slug, label]) => ({ slug, label })),
    ];
  }, [products]);

  const visible = useMemo(
    () =>
      activeTab === ALL_TAB
        ? products
        : products.filter((p) => p.categorySlug === activeTab),
    [products, activeTab],
  );

  const count = visible.length;
  /** Nothing to loop when everything already fits on screen. */
  const canSlide = count > perView;

  // Enough copies that the row is always full — including the moment the track
  // sits one full list to the left, mid-wrap.
  const track = useMemo(() => {
    if (count === 0) return [];
    if (!canSlide) return visible;

    const needed = count + perView + 1;
    const copies = Math.max(2, Math.ceil(needed / count));
    return Array.from({ length: copies }, () => visible).flat();
  }, [visible, count, perView, canSlide]);

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

  // Switching filters replaces the whole list, so the rail must start over
  // rather than keep a translate that belonged to a different set of cards.
  useEffect(() => {
    movingRef.current = false;
    setOffset(0);
    controls.set({ x: 0 });
  }, [activeTab, controls]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const goNext = useCallback(async () => {
    if (movingRef.current || step <= 0 || !canSlide) return;
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
  }, [controls, count, offset, step, canSlide]);

  const goPrev = useCallback(async () => {
    if (movingRef.current || step <= 0 || !canSlide) return;
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
  }, [controls, count, offset, step, canSlide]);

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

  const autoplay = !paused && !reducedMotion && canSlide && step > 0;

  // Keyed on `offset`, so every advance — manual or automatic — restarts the
  // full dwell rather than cutting the next one short.
  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(goNext, SLIDE_INTERVAL);
    return () => clearTimeout(timer);
  }, [autoplay, goNext, offset]);

  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="new-arrivals"
      aria-roledescription="carousel"
      className={cn("container-page py-12 sm:py-16", className)}
    >
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
          <Sparkles size={13} aria-hidden="true" />
          Just landed
        </span>

        <h2
          id="new-arrivals"
          className="mt-3 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
        >
          New Arrival Products
        </h2>
        <p className="mt-1.5 max-w-xl text-sm text-ink-500">
          The latest smart security and automation gear, fresh on the shelf.
        </p>
      </div>

      {/* Category pills — client-side filtering of the same payload.
          These are filter toggles rather than tabs: there is no tab panel to
          own, so `aria-pressed` describes them honestly and they keep normal
          tab-key navigation instead of the arrow-key model a tablist implies. */}
      {tabs.length > 2 ? (
        <div
          role="group"
          aria-label="Filter new arrivals by category"
          className="mt-6 flex flex-wrap justify-center gap-2"
        >
          {tabs.map((tab) => {
            const selected = tab.slug === activeTab;
            return (
              <button
                key={tab.slug}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.slug)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                  selected
                    ? "bg-ink-900 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200 hover:text-ink-900",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-6 mb-4 flex items-center justify-between gap-4 sm:mt-8">
        <Link
          href="/new-arrivals"
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 transition-colors hover:text-brand-700"
        >
          View all new arrivals
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>

        {canSlide ? (
          <div className="flex items-center gap-1.5">
            <RailButton label="Previous new arrivals" onClick={goPrev}>
              <ChevronLeft size={18} />
            </RailButton>

            <RailButton
              label={
                paused
                  ? "Resume new arrivals slideshow"
                  : "Pause new arrivals slideshow"
              }
              onClick={() => setPaused((p) => !p)}
              pressed={paused}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </RailButton>

            <RailButton label="Next new arrivals" onClick={goNext}>
              <ChevronRight size={18} />
            </RailButton>
          </div>
        ) : null}
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
          {track.map((product, position) => {
            // Only the first pass is real; the rest exist to fill the loop.
            const isClone = position >= count;

            return (
              <li
                key={`${product.id}-${position}`}
                ref={position === 0 ? cardRef : undefined}
                aria-hidden={isClone || undefined}
                className={cn(
                  "shrink-0",
                  "basis-[calc((100%-1rem)/2)]",
                  "md:basis-[calc((100%-2rem)/3)]",
                  "lg:basis-[calc((100%-3rem)/4)]",
                )}
              >
                <ProductCard
                  product={product}
                  focusable={!isClone}
                  onFocus={
                    isClone
                      ? undefined
                      : () => {
                          // Keep a keyboard-focused card on screen.
                          const onScreen =
                            position >= offset && position < offset + perView;
                          if (!onScreen) void goTo(position);
                        }
                  }
                  className="h-full"
                />
              </li>
            );
          })}
        </motion.ul>
      </div>

      {canSlide ? (
        <div className="mt-6 flex justify-center gap-1.5">
          {visible.map((product, dot) => (
            <button
              key={product.id}
              type="button"
              onClick={() => void goTo(dot)}
              aria-label={`Show ${product.name}`}
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
      ) : null}
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

/** Suspense fallback that reserves the same height, so CLS stays at zero. */
export function NewArrivalsCarouselSkeleton() {
  return (
    <section className="container-page py-12 sm:py-16">
      <div className="flex flex-col items-center">
        <div className="skeleton h-6 w-28 rounded-full" />
        <div className="skeleton mt-3 h-8 w-72 rounded" />
        <div className="skeleton mt-2 h-4 w-96 max-w-full rounded" />
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-7 w-24 rounded-full" />
        ))}
      </div>

      <div className="mt-10 flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 basis-[calc((100%-1rem)/2)] md:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)]"
          >
            <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
              <div className="skeleton aspect-square w-full" />
              <div className="space-y-2 p-4">
                <div className="skeleton h-3 w-1/3 rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="skeleton h-4 w-1/2 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
