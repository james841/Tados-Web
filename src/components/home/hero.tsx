"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Star,
  ArrowRight,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui";
import { CITIES_SENTENCE, DELIVERY_WINDOW, SITE } from "@/lib/constants";

/** How long each slide stays on screen, in milliseconds. */
const SLIDE_DURATION = 6000;
const SLIDE_SECONDS = SLIDE_DURATION / 1000;
/** Crossfade length. Short enough to stay snappy. */
const FADE_SECONDS = 0.85;
/** Horizontal travel (px) that counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD = 45;

/**
 * `tone` describes the photograph, not the styling, and the scrim reacts to it.
 *
 * `photo` slides are lifestyle shots that are already mid-dark, so they're
 * dimmed to sit behind white type. `studio` slides are shot on white — dimming
 * those turns them grey, which is exactly what a product lineup must not look
 * like, so they play at full strength and the left-hand scrim alone carries
 * legibility.
 */
type SlideTone = "photo" | "studio";

const HERO_SLIDES: {
  image: string;
  alt: string;
  /** Names this slide in the indicator rail. Doubles as its category. */
  label: string;
  tone: SlideTone;
  /** Only the Y value matters on wide screens — see the scrim comment below. */
  objectPosition: string;
  showLogo: boolean;
  title: string;
  titleAccent: string;
  description: string;
}[] = [
   {
    image: "/combination of images.jpeg",
    alt: "The Tados range laid out together: smart curtain kit, fingerprint and facial recognition door locks, smart padlock, security panel, sensors and a ceiling speaker",
    label: "Full Range",
    tone: "studio",
    objectPosition: "50% 38%",
    showLogo: false,
    title: "Everything You Need,",
    titleAccent: "In One Place.",
    description: `Smart locks, alarm panels, padlocks, sensors, curtain kits and ceiling speakers — the complete range from one supplier, with installation available in ${CITIES_SENTENCE}.`,
  },
  {
    image: "/products/hero-smart-home.jpg",
    alt: "Smart security devices installed in a modern South African home",
    label: "Smart Home",
    tone: "photo",
    objectPosition: "50% 50%",
    showLogo: true,
    title: "Secure Your Space,",
    titleAccent: "Smartly.",
    description: `Smart locks, alarm systems, biometric padlocks and home automation. Nationwide delivery in ${DELIVERY_WINDOW}, warranty support and secure PayFast checkout.`,
  },
  {
    image:
      "/smart background.jpg",
    alt: "3D facial recognition door lock on a warm studio background",
    label: "Smart Locks",
    tone: "photo",
    objectPosition: "50% 50%",
    showLogo: false,
    title: "Unlock with",
    titleAccent: "Your Face.",
    description:
      "Advanced 3D facial recognition technology that works in seconds, day or night. Anti-spoof protection and multiple user management.",
  },
  {
    image:
      "/Web Photos-20260804T004405Z-1-001/Web Photos/Smart Security Alarm System.png",
    alt: "Smart alarm system panel on a warm studio background",
    label: "Alarms",
    tone: "photo",
    objectPosition: "50% 50%",
    showLogo: false,
    title: "Complete",
    titleAccent: "Protection.",
    description:
      "24/7 monitoring with instant mobile alerts. Door sensors, motion detectors and remote arm/disarm from anywhere.",
  },
 
];

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((index: number) => {
    setCurrentSlide(
      ((index % HERO_SLIDES.length) + HERO_SLIDES.length) % HERO_SLIDES.length,
    );
  }, []);

  const step = useCallback(
    (delta: number) => setCurrentSlide((prev) =>
      (prev + delta + HERO_SLIDES.length) % HERO_SLIDES.length,
    ),
    [],
  );

  useEffect(() => {
    if (paused) return;

    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION);

    return () => clearTimeout(timer);
  }, [currentSlide, paused]);

  useEffect(() => {
    const onVisibilityChange = () => {
      setPaused(document.visibilityState === "hidden");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured products"
      className="relative h-[640px] overflow-hidden bg-ink-950 sm:h-[720px] lg:h-[800px]"
      // Arrow keys are scoped to the section rather than the window: a global
      // listener would steal the arrow keys people use to scroll the page.
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          step(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          step(-1);
        }
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;

        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) < SWIPE_THRESHOLD) return;
        step(delta < 0 ? 1 : -1);
      }}
    >
      {/* Background image layers */}
      <div className="absolute inset-0">
        {HERO_SLIDES.map((item, index) => {
          const isActive = index === currentSlide;

          return (
            <motion.div
              key={item.image}
              aria-hidden={!isActive}
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={{ duration: FADE_SECONDS, ease: [0.4, 0, 0.2, 1] }}
              style={{ willChange: "opacity" }}
            >
              <motion.div
                className="absolute inset-0"
                initial={false}
                animate={{ scale: reduceMotion ? 1 : isActive ? 1 : 1.06 }}
                transition={{
                  duration: isActive ? SLIDE_SECONDS + FADE_SECONDS : 0.5,
                  ease: "easeOut",
                }}
              >
                <Image
                  fill
                  src={item.image}
                  alt={item.alt}
                  sizes="100vw"
                  quality={80}
                  priority={index === 0}
                  loading="eager"
                  style={{ objectPosition: item.objectPosition }}
                  className={
                    item.tone === "studio"
                      ? "object-cover saturate-[1.02]"
                      : "object-cover opacity-60 saturate-[1.05]"
                  }
                />
              </motion.div>
            </motion.div>
          );
        })}

        {/* Scrim, in three layers rather than one flat veil.

            A single dark wash reads fine over a dim lifestyle photo and murders
            a white studio shot — and on a wide screen `object-cover` only crops
            vertically, so the products genuinely do sit under the copy and
            can't be nudged aside. The fix is directional darkness: heavy on the
            left where the type lives, clearing by the middle so the hardware on
            the right stays bright.

            1. base veil — carries mobile, where the copy spans full width and
               there is no empty side to fade towards
            2. left-to-right — the readability panel behind the type
            3. bottom-up — grounds the buttons and the indicator rail */}
        <div className="absolute inset-0 bg-ink-950/45 lg:bg-ink-950/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 from-0% via-ink-950/60 via-45% to-transparent to-80%" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 from-0% via-transparent via-40% to-transparent" />
      </div>

      {/* Brand Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 right-6 z-10 hidden lg:block"
      >
        <Logo variant="light" className="h-28 opacity-[0.05]" />
      </div>

      <div className="container-page relative z-20 flex h-full items-center">
        <div className="max-w-2xl py-20 sm:py-28 lg:py-32">
          {/* Social Proof Badge */}
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md transition-colors hover:border-white/20">
            <div className="flex" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={13}
                  className="fill-amber-400 text-amber-400"
                />
              ))}
            </div>
            <div className="h-3.5 w-px bg-white/20" />
            <span className="text-xs font-semibold tracking-wide text-white/90">
              438 reviews on <span className="text-emerald-400">Trustpilot</span>
            </span>
          </div>

          {/* Animated Copy */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {slide.showLogo ? (
                <div className="mt-7">
                  <Logo
                    variant="light"
                    showTagline
                    className="h-14 sm:h-[68px]"
                  />
                  <span className="sr-only">{SITE.name}</span>
                </div>
              ) : null}

              <motion.h1
                className={
                  slide.showLogo
                    ? "mt-5 text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
                    : "mt-6 text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
                }
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.04 }}
              >
                {slide.title}
                <br />
                <span className="text-brand-400">{slide.titleAccent}</span>
              </motion.h1>

              <motion.p
                className="mt-6 max-w-lg text-base font-medium leading-relaxed text-ink-100 sm:text-lg"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
              >
                {slide.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink
              href="/products"
              variant="primary"
              size="lg"
              className="group transition-transform duration-300 hover:scale-[1.02]"
            >
              Explore Products
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </ButtonLink>
            <ButtonLink
              href="/category/smart-locks"
              size="lg"
              className="border border-white/15 bg-white/5 text-white backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-white/30 hover:bg-white/10"
            >
              Shop Smart Locks
            </ButtonLink>
          </div>

          {/* Slide index.
              Named rather than numbered. Four anonymous bars tell you how many
              slides there are, which nobody wants to know; the category names
              tell you what's coming and let you jump straight to the one you
              came for. Slide order carries no meaning, so there's nothing to
              number. Labels are desktop-only — on a phone they'd wrap past the
              buttons above them, so the bars go back to plain pagination and
              swipe does the work. */}
          <div className="mt-12 flex items-end gap-4 sm:gap-6">
            {HERO_SLIDES.map((item, index) => {
              const isActive = index === currentSlide;

              return (
                <button
                  key={item.image}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Show ${item.label}`}
                  aria-current={isActive}
                  className="group flex flex-col gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-4 focus-visible:ring-offset-ink-950"
                >
                  <span
                    className={
                      isActive
                        ? "hidden text-[11px] font-bold uppercase tracking-widest text-white transition-colors sm:block"
                        : "hidden text-[11px] font-bold uppercase tracking-widest text-white/45 transition-colors group-hover:text-white/80 sm:block"
                    }
                  >
                    {item.label}
                  </span>

                  {/* Narrow/wide on mobile where there's no label to measure
                      against; the full width of its own label on desktop, so
                      the bar reads as that category's progress. */}
                  <span
                    className={
                      isActive
                        ? "relative h-1.5 w-12 overflow-hidden rounded-full bg-white/20 transition-all duration-300 sm:w-full"
                        : "relative h-1.5 w-5 overflow-hidden rounded-full bg-white/20 transition-all duration-300 group-hover:bg-white/40 sm:w-full"
                    }
                  >
                    {isActive ? (
                      paused ? (
                        <span className="absolute inset-0 bg-white" />
                      ) : (
                        <motion.span
                          key={`fill-${currentSlide}`}
                          className="absolute inset-y-0 left-0 bg-white"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{
                            duration: SLIDE_SECONDS,
                            ease: "linear",
                          }}
                        />
                      )
                    ) : null}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "Resume slideshow" : "Pause slideshow"}
              className="mb-px ml-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white outline-none backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
            >
              {paused ? <Play size={11} /> : <Pause size={11} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BrandStrip() {
  const brands = ["Tuya", "Aqara", "Hikvision", "Sonoff", "Smart Life", "Zigbee"];

  return (
    <section
      aria-label="Brands we stock"
      className="relative z-10 border-b border-ink-100 bg-white py-8"
    >
      <div className="container-page">
        <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-ink-400 sm:text-left">
          Featured Brand
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 sm:justify-between">
          {brands.map((brand) => (
            <span
              key={brand}
              className="text-lg font-bold tracking-tight text-ink-300 transition-all duration-300 hover:scale-105 hover:text-ink-800"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PromoBand() {
  return (
    <section className="container-page py-16 sm:py-20">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mega Sale Card - Solid Brand Color */}
        <Link
          href="/products?onSale=1"
          className="group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-3xl bg-brand-600 p-8 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300 backdrop-blur-md border border-white/10">
              <Sparkles size={12} />
              Mega Sale
            </span>
            <p className="mt-4 text-3xl font-black leading-none tracking-tight">
              Save up to
              <br />
              <span className="text-6xl font-black text-amber-300">
                25%
              </span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Big savings on every smart security essential
            </p>
          </div>

          <span className="relative z-10 mt-6 inline-flex items-center gap-2 text-sm font-bold tracking-wide">
            Shop deals
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-all duration-300 group-hover:bg-white group-hover:text-brand-700">
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </span>
        </Link>

        {/* Highest Rated Card - Off-White Neutral Container */}
        <Link
          href="/products?sort=rating"
          className="group relative flex min-h-[300px] flex-col justify-center overflow-hidden rounded-3xl border border-ink-200 bg-ink-50 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-lg lg:col-span-2 sm:p-10"
        >
          <div className="relative z-10 max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
              Top Rated Choices
            </span>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-ink-950 sm:text-4xl">
              Explore Our
              <br />
              Highest Rated
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Check out our top-rated smart devices, trusted by thousands of
              South African homes and businesses.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-ink-950 transition-colors group-hover:text-brand-600">
              View All
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1.5"
              />
            </span>
          </div>

          <div className="absolute -right-8 bottom-0 top-0 hidden w-2/5 transition-transform duration-500 group-hover:scale-105 sm:block">
            <Image
              fill
              src="/Facial Lock.png"
              alt=""
              sizes="(max-width: 1024px) 40vw, 30vw"
              className="object-contain object-right drop-shadow-xl"
            />
          </div>
        </Link>
      </div>
    </section>
  );
}

export function DealBanners() {
  const deals = [
    {
      title: "All Smart Locks",
      subtitle: "Up to 20% Off!",
      href: "/category/smart-locks",
      image: "/gigi.jpg",
      bgColor: "bg-ink-950",
    },
    {
      title: "Alarm Systems",
      subtitle: "Up to 18% Off!",
      href: "/category/alarms-detection",
      image: "/videoframe.png",
      bgColor: "bg-ink-900",
    },
   
  ];

  return (
    <section className="container-page py-4">
      <div className="grid gap-6 sm:grid-cols-2">
        {deals.map((deal) => (
          <Link
            key={deal.href}
            href={deal.href}
            className={`group relative flex min-h-[220px] flex-col justify-center overflow-hidden rounded-3xl ${deal.bgColor} p-8 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
          >
            <div className="relative z-10 max-w-[60%]">
              <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-white/70">
                Today&apos;s Best Deal
              </span>
              <h3 className="mt-1.5 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                {deal.title}
              </h3>
              <p className="mt-1 text-sm font-semibold text-white/90">{deal.subtitle}</p>
              
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink-950 shadow-sm transition-all duration-300 group-hover:bg-white/90">
                Shop now
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
            </div>

            <div className="absolute bottom-0 right-0 top-0 w-1/2 opacity-80 transition-transform duration-500 group-hover:scale-105">
              {/* Solid left edge mask for image transition */}
              <div className="absolute inset-y-0 left-0 w-16 bg-ink-950 z-10 hidden sm:block" />
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

export function LifestyleCta() {
  return (
    <section className="relative my-16 overflow-hidden bg-ink-950 py-20 sm:my-20 sm:py-28">
      <div className="absolute inset-0">
        <Image
          fill
          src="/smart 2.png"
          alt=""
          sizes="100vw"
          className="object-cover opacity-35 filter saturate-[1.05]"
        />
      </div>

      <div className="container-page relative z-10">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 border border-brand-500/20 px-3 py-1 backdrop-blur-md">
            <ShieldCheck size={14} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
              A new standard of security
            </span>
          </div>

          <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
            Protect what matters with devices you can control from anywhere.
          </h2>

          <ButtonLink
            href="/products"
            size="lg"
            className="mt-8 border border-white/15 bg-white/5 text-white backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:scale-[1.02]"
          >
            Explore All Products
            <ArrowRight size={18} />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}