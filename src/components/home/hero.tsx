"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
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
    image:
      "/Web Photos-20260804T004405Z-1-001/Web Photos/Smart 3D Facial Recognition Door Lock.png",
    alt: "3D facial recognition door lock on a warm studio background",
    title: "Unlock with",
    titleAccent: "Your Face.",
    description:
      "Advanced 3D facial recognition technology that works in seconds, day or night. Anti-spoof protection and multiple user management.",
  },
  {
    image:
      "/Web Photos-20260804T004405Z-1-001/Web Photos/Smart Security Alarm System.png",
    alt: "Smart alarm system panel on a warm studio background",
    title: "Complete",
    titleAccent: "Protection.",
    description:
      "24/7 monitoring with instant mobile alerts. Door sensors, motion detectors and remote arm/disarm from anywhere.",
  },
];

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
    <section className="relative h-[640px] overflow-hidden bg-ink-950 sm:h-[720px] lg:h-[800px]">
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
                className="object-cover opacity-80 filter saturate-[1.05]"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* ADJUSTED: Overlays added back, tuned down slightly (from 95%/80% originally down to 65%/35%) */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/65 via-ink-950/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/40 via-transparent to-ink-950/10" />
      </div>

      <div className="container-page relative z-20 flex h-full items-center">
        <div className="max-w-2xl py-20 sm:py-28 lg:py-32">
          {/* Social Proof Pill */}
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 backdrop-blur-md transition-all hover:border-white/20">
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
                className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
              >
                {slide.title}
                <br />
                <span className="text-brand-400">
                  {slide.titleAccent}
                </span>
              </motion.h1>

              <motion.p
                className="mt-6 max-w-lg text-base font-medium leading-relaxed text-white/90 sm:text-lg drop-shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 }}
              >
                {slide.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Call-to-actions */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink 
              href="/products" 
              variant="primary" 
              size="lg"
              className="group transition-transform duration-300 hover:scale-[1.02]"
            >
              Explore Products
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </ButtonLink>
            <ButtonLink
              href="/category/smart-locks"
              size="lg"
              className="border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/20 hover:scale-[1.02]"
            >
              Shop Smart Locks
            </ButtonLink>
          </div>

          {/* Slide indicators with progress bar */}
          <div className="mt-12 flex items-center gap-3">
            {HERO_SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentSlide}
                className="group relative h-1.5 overflow-hidden rounded-full bg-white/30 transition-all duration-300 hover:bg-white/50"
                style={{ width: index === currentSlide ? 48 : 20 }}
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

export function BrandStrip() {
  const brands = ["Tuya", "Aqara", "Hikvision", "Sonoff", "Smart Life", "Zigbee"];

  return (
    <section
      aria-label="Brands we stock"
      className="relative z-10 border-b border-ink-100 bg-white py-8"
    >
      <div className="container-page">
        <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-ink-400 sm:text-left">
          Trusted Brand Partners
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
        {/* Tall mega-sale tile */}
        <Link
          href="/products?onSale=1"
          className="group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-3xl bg-brand-600 p-8 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
        >
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent-300 backdrop-blur-md">
              <Sparkles size={12} />
              Mega Sale
            </span>
            <p className="mt-4 text-3xl font-black leading-none tracking-tight">
              Save up to
              <br />
              <span className="text-6xl font-black text-accent-300">
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

        {/* Wide bestseller panel */}
        <Link
          href="/bestsellers"
          className="group relative flex min-h-[300px] flex-col justify-center overflow-hidden rounded-3xl border border-ink-100 bg-ink-100/60 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-ink-200 hover:shadow-xl lg:col-span-2 sm:p-10"
        >
          <div className="relative z-10 max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-700">
              Top Rated Choices
            </span>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-ink-950 sm:text-4xl">
              Explore Best
              <br />
              Selling Products
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Check out our top-rated smart devices, trusted by thousands of
              South African homes and businesses.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent-600 transition-colors group-hover:text-accent-700">
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
              src="/smart background.jpg"
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
      tone: "bg-ink-900",
    },
    {
      title: "Alarm Systems",
      subtitle: "Up to 18% Off!",
      href: "/category/alarms-detection",
      image: "/videoframe.png",
      tone: "bg-accent-700",
    },
  ];

  return (
    <section className="container-page py-4">
      <div className="grid gap-6 sm:grid-cols-2">
        {deals.map((deal) => (
          <Link
            key={deal.href}
            href={deal.href}
            className={`group relative flex min-h-[220px] flex-col justify-center overflow-hidden rounded-3xl ${deal.tone} p-8 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
          >
            <div className="relative z-10 max-w-[60%]">
              <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-white/70">
                Today&apos;s Best Deal
              </span>
              <h3 className="mt-1.5 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                {deal.title}
              </h3>
              <p className="mt-1 text-sm font-semibold text-white/90">{deal.subtitle}</p>
              
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink-950 shadow-sm transition-all duration-300 group-hover:bg-white/90 group-hover:shadow-md">
                Shop now
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
            </div>

            <div className="absolute bottom-0 right-0 top-0 w-1/2 opacity-85 transition-transform duration-500 group-hover:scale-105">
              {/* ADJUSTED: Soft dark vignette layer re-added to ensure text pops off the deal images */}
              <div className="absolute inset-0 bg-gradient-to-r from-ink-950/40 via-transparent to-transparent z-10" />
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
          className="object-cover opacity-65 filter saturate-[1.1]"
        />
        {/* ADJUSTED: Overlays tuned down slightly (from original 100%/80% to 75%/45%) */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/75 via-ink-950/45 to-transparent" />
      </div>

      <div className="container-page relative z-10">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 border border-brand-500/30 px-3 py-1 backdrop-blur-md">
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
            className="mt-8 border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/20 hover:scale-[1.02]"
          >
            Explore All Products
            <ArrowRight size={18} />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}