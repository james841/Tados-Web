"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { ButtonLink } from "@/components/ui";

/** How long each slide stays on screen, in milliseconds. */
const SLIDE_DURATION = 6000;

const HERO_SLIDES = [
  {
    image: "/products/hero-smart-home.jpg",
    alt: "Smart security devices installed in a modern South African home",
    title: "Secure Your Space,",
    titleAccent: "Smartly.",
    description:
      "Smart locks, alarm systems, biometric padlocks and home automation from trusted brands. Nationwide delivery, 2-year warranty and secure PayFast checkout.",
  },
  {
    image: "/products/hero-facial-lock.jpg",
    alt: "3D facial recognition door lock",
    title: "Unlock with",
    titleAccent: "Your Face.",
    description:
      "Advanced 3D facial recognition technology that works in seconds, day or night. Anti-spoof protection and multiple user management.",
  },
  {
    image: "/products/hero-alarm-system.jpg",
    alt: "Smart alarm system with sensors",
    title: "Complete",
    titleAccent: "Protection.",
    description:
      "24/7 monitoring with instant mobile alerts. Door sensors, motion detectors and remote arm/disarm from anywhere.",
  },
];

/**
 * Hero carousel driven by Framer Motion.
 *
 * Each slide crossfades in while its image slowly zooms *out* from 1.18 → 1.0
 * over the full slide duration (the Ken Burns effect). Because the zoom runs
 * for the whole time the slide is visible, the movement reads as continuous
 * rather than as a transition — the image is still drifting when the next one
 * begins to fade in.
 *
 * The headline and body copy are keyed on the slide index, so AnimatePresence
 * fades and lifts them out and brings the next pair in with a small stagger.
 */
export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section className="relative overflow-hidden bg-ink-900">
      {/* Image carousel background */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute inset-0"
              // Slow zoom-out for the entire time the slide is on screen.
              initial={{ scale: 1.18 }}
              animate={{ scale: 1 }}
              transition={{
                duration: SLIDE_DURATION / 1000 + 1.4,
                ease: "linear",
              }}
            >
              <Image
                fill
                priority={currentSlide === 0}
                src={slide.image}
                alt={slide.alt}
                sizes="100vw"
                className="object-cover opacity-70"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/20" />
      </div>

      <div className="container-page relative">
        <div className="max-w-xl py-24 sm:py-32 lg:py-36">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  className="fill-accent-400 text-accent-400"
                />
              ))}
            </div>
            <span className="text-xs font-medium text-white/80">
              438 reviews on Trustpilot
            </span>
          </div>

          {/* Animated text content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.h1
                className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
              >
                {slide.title}
                <br />
                <span className="text-brand-400">{slide.titleAccent}</span>
              </motion.h1>

              <motion.p
                className="mt-5 max-w-md text-base leading-relaxed text-white/70"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 }}
              >
                {slide.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/products" variant="primary" size="lg">
              Explore Products
              <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink
              href="/category/smart-locks"
              size="lg"
              className="border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20"
            >
              Shop Smart Locks
            </ButtonLink>
          </div>

          {/* Slide indicators — the active one fills as a progress bar */}
          <div className="mt-8 flex gap-2">
            {HERO_SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentSlide}
                className="relative h-1 overflow-hidden rounded-full bg-white/25 transition-all"
                style={{ width: index === currentSlide ? 40 : 16 }}
              >
                {index === currentSlide ? (
                  <motion.span
                    key={`fill-${currentSlide}`}
                    className="absolute inset-y-0 left-0 bg-white"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: SLIDE_DURATION / 1000,
                      ease: "linear",
                    }}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Brand logo strip, muted so it never competes with the hero. */
export function BrandStrip() {
  const brands = ["Tuya", "Aqara", "Hikvision", "Sonoff", "Smart Life", "Zigbee"];

  return (
    <section
      aria-label="Brands we stock"
      className="border-b border-ink-200 bg-white py-7"
    >
      <div className="container-page">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:justify-between">
          {brands.map((brand) => (
            <span
              key={brand}
              className="text-lg font-semibold tracking-tight text-ink-300 transition-colors hover:text-ink-500"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Promo band — this is the third reference image folded into the home page:
 * a tall sale tile, a wide "Explore Best Selling Products" panel, and a
 * secondary sale tile. Compact enough that the page doesn't get long.
 */
export function PromoBand() {
  return (
    <section className="container-page py-12 sm:py-16">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tall mega-sale tile */}
        <Link
          href="/products?onSale=1"
          className="group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-card bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">
              Mega Sale
            </p>
            <p className="mt-2 text-3xl font-extrabold leading-tight">
              Save up to
              <br />
              <span className="text-5xl text-accent-300">25%</span>
            </p>
            <p className="mt-2 text-sm text-white/80">
              Big savings on every smart security essential
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            Shop deals
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </span>
        </Link>

        {/* Wide bestseller panel */}
        <Link
          href="/bestsellers"
          className="group relative flex min-h-64 flex-col justify-center overflow-hidden rounded-card bg-ink-100 p-8 lg:col-span-2"
        >
          <div className="relative z-10 max-w-sm">
            <h2 className="text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
              Explore Best
              <br />
              Selling Products
            </h2>
            <p className="mt-3 text-sm text-ink-600">
              Check out our top-rated smart devices, trusted by thousands of
              South African homes and businesses.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-accent-600">
              View All
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </span>
          </div>

          <div className="absolute -right-6 bottom-0 top-0 hidden w-2/5 sm:block">
            <Image
              fill
              src="/products/promo-bestsellers.jpg"
              alt=""
              sizes="(max-width: 1024px) 40vw, 30vw"
              className="object-contain object-right"
            />
          </div>
        </Link>
      </div>
    </section>
  );
}

/** Two side-by-side "today's best deal" banners. */
export function DealBanners() {
  const deals = [
    {
      title: "All Smart Locks",
      subtitle: "Up to 20% Off!",
      href: "/category/smart-locks",
      image: "/products/deal-locks.jpg",
      tone: "from-ink-800 to-ink-950",
    },
    {
      title: "Alarm Systems",
      subtitle: "Up to 18% Off!",
      href: "/category/alarms-detection",
      image: "/products/deal-alarms.jpg",
      tone: "from-accent-600 to-accent-800",
    },
  ];

  return (
    <section className="container-page py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {deals.map((deal) => (
          <Link
            key={deal.href}
            href={deal.href}
            className={`group relative flex min-h-48 flex-col justify-center overflow-hidden rounded-card bg-gradient-to-br ${deal.tone} p-7 text-white`}
          >
            <div className="relative z-10">
              <p className="text-xs font-medium uppercase tracking-widest text-white/60">
                Today&apos;s Best Deal
              </p>
              <h3 className="mt-2 text-2xl font-bold leading-tight">
                {deal.title}
              </h3>
              <p className="text-sm text-white/80">{deal.subtitle}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink-900">
                Shop now
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </div>

            <div className="absolute bottom-0 right-0 top-0 w-1/2 opacity-60">
              <Image
                fill
                src={deal.image}
                alt=""
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Dark full-width CTA that breaks up the product grids. */
export function LifestyleCta() {
  return (
    <section className="relative my-12 overflow-hidden bg-ink-950 sm:my-16">
      <div className="absolute inset-0">
        <Image
          fill
          src="/products/cta-lifestyle.jpg"
          alt=""
          sizes="100vw"
          className="object-cover opacity-40"
        />
      </div>

      <div className="container-page relative py-16 sm:py-20">
        <div className="max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
            A new standard of security
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Protect what matters with devices you can control from anywhere.
          </h2>
          <ButtonLink
            href="/products"
            size="lg"
            className="mt-7 border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            Explore All Products
            <ArrowRight size={18} />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
