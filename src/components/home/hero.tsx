"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";

import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui";
import {
  CITIES_DIVIDED,
  CITIES_SENTENCE,
  DELIVERY_WINDOW,
  SITE,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

/** How long each slide stays on screen, in milliseconds. */
const SLIDE_DURATION = 6000;
const SLIDE_SECONDS = SLIDE_DURATION / 1000;
/** Crossfade length. Short enough to stay snappy. */
const FADE_SECONDS = 0.85;
/** Horizontal travel (px) that counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD = 45;
/**
 * Speed (px/sec) that advances the slide regardless of how far the finger got.
 *
 * Distance alone isn't enough: a quick flick on a phone often travels barely
 * 20px, and a carousel that snaps back from a deliberate flick feels broken
 * rather than firm.
 */
const SWIPE_VELOCITY = 400;

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
  const [dragging, setDragging] = useState(false);
  /**
   * Whether to hand the slider over to a finger.
   *
   * Drag is enabled for touch pointers only. On a phone it's how everybody
   * expects a carousel to work; with a mouse it isn't, and framer-motion has to
   * capture pointerdown to track a gesture — which would stop anyone selecting
   * the headline or dragging to highlight a price. The buttons below are the
   * pointer affordance, so the mouse loses nothing.
   */
  const [touchDevice, setTouchDevice] = useState(false);
  const reduceMotion = useReducedMotion();

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
    const query = window.matchMedia("(pointer: coarse)");
    const sync = () => setTouchDevice(query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Autoplay is held while a finger is down as well as while paused: advancing
  // out from under someone mid-gesture is the one thing worse than not
  // advancing at all. Letting go restarts the full interval rather than
  // resuming a part-spent one, so the slide you landed on gets its whole turn.
  const held = paused || dragging;

  useEffect(() => {
    if (held) return;

    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION);

    return () => clearTimeout(timer);
  }, [currentSlide, held]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    setDragging(false);

    const travelled = info.offset.x;
    const flicked = info.velocity.x;

    if (travelled <= -SWIPE_THRESHOLD || flicked <= -SWIPE_VELOCITY) {
      step(1);
    } else if (travelled >= SWIPE_THRESHOLD || flicked >= SWIPE_VELOCITY) {
      step(-1);
    }
  }

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
    >
      {/* Everything the eye sees sits on one draggable layer — photo, scrim,
          copy and controls together — so a swipe moves the whole slide as a
          single object instead of sliding the picture out from under its own
          headline.

          Constraints of zero in both directions turn the drag into a
          rubber-band: the layer follows the finger, then springs back while the
          crossfade takes over. It is deliberately not a sliding track. The
          slides transition by fading, and a track would have to abandon that
          for every visitor in order to serve the gesture.

          `dragDirectionLock` is the part that keeps the page usable —
          framer-motion commits to whichever axis the gesture opens on, so
          scrolling down the homepage past the hero behaves exactly as it did
          and never gets swallowed by the carousel. */}
      <motion.div
        className="absolute inset-0"
        drag={touchDevice ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragMomentum={false}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
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

              A single dark wash reads fine over a dim lifestyle photo and
              murders a white studio shot — and on a wide screen `object-cover`
              only crops vertically, so the products genuinely do sit under the
              copy and can't be nudged aside. The fix is directional darkness:
              heavy on the left where the type lives, clearing by the middle so
              the hardware on the right stays bright.

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
            {/* Two claims the business can actually stand behind.

                This was a pill reading "438 reviews on Trustpilot", with the
                count hard-coded and no Trustpilot profile behind it. A shopper
                who goes looking for those reviews and finds nothing has learned
                something far more damaging than the badge ever bought — and
                under the Consumer Protection Act an invented review count is a
                false representation, not marketing licence.

                What replaces it answers what a South African shopper actually
                hesitates over on a R9 000 door lock: will it arrive, and can
                somebody fit it. Both are true, and both are stated elsewhere on
                the site, so nothing here can drift out of step on its own. */}
            <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md transition-colors hover:border-white/20">
              <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/90">
                <Truck size={13} className="text-brand-400" aria-hidden="true" />
                Nationwide delivery in {DELIVERY_WINDOW}
              </span>
              <span
                aria-hidden="true"
                className="hidden h-3.5 w-px bg-white/20 sm:block"
              />
              <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/90">
                <Wrench size={13} className="text-brand-400" aria-hidden="true" />
                Installation in {CITIES_DIVIDED}
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
                  /* `tracking-[-0.025em]` rather than `tracking-tight`:
                     Archivo's default sidebearings are drawn for text sizes, and
                     at 72px the gaps between letters open up enough to read as
                     a gap in the word. Display type needs negative tracking in
                     proportion to its size, which is why the mobile step is
                     looser than the desktop one. */
                  className={
                    slide.showLogo
                      ? "mt-5 font-display text-3xl font-black leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl"
                      : "mt-6 font-display text-[2.6rem] font-black leading-[1.02] tracking-[-0.02em] text-white sm:text-6xl sm:tracking-[-0.025em] lg:text-7xl"
                  }
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.04 }}
                >
                  {slide.title}
                  <br />
                  {/* The accent half of the headline carries the brand green.
                      A gradient wash was the alternative and it loses: on a
                      photographic hero the top of each letter goes pale enough
                      to drop under 3:1 against a bright patch of the image,
                      and it reads as a rendering fault rather than a flourish. */}
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

            {/* Slide index — and the second way to drive the carousel.

                Swiping is the one people reach for on a phone, but it is
                invisible: nothing on screen says it exists. These bars are the
                visible half of the pair, and they work on every input — tap,
                click or keyboard — so the slider is never dependent on a
                gesture being guessed.

                Named rather than numbered. Four anonymous bars tell you how
                many slides there are, which nobody wants to know; the category
                names tell you what's coming and let you jump straight to the
                one you came for. Slide order carries no meaning, so there's
                nothing to number. Labels are desktop-only — on a phone they'd
                wrap past the buttons above them. */}
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
                    /* The padding/negative-margin pair grows the touch target
                       to roughly 26px tall on a phone without moving anything:
                       the bar itself is 6px, which is a target only a mouse can
                       hit. Desktop has the label to aim at, so it drops back to
                       no padding. */
                    className="group -my-2.5 flex flex-col gap-2 rounded-sm py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-4 focus-visible:ring-offset-ink-950 sm:my-0 sm:py-0"
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
                          : "relative h-1.5 w-8 overflow-hidden rounded-full bg-white/20 transition-all duration-300 group-hover:bg-white/40 sm:w-full"
                      }
                    >
                      {isActive ? (
                        // Solid while held, so a paused or part-dragged slider
                        // doesn't show a bar creeping towards an advance that
                        // isn't coming.
                        held ? (
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
                className="mb-px ml-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white outline-none backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 sm:size-7"
              >
                {paused ? <Play size={12} /> : <Pause size={12} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/**
 * The brands we stock.
 *
 * `logo` is optional and there are no files behind it yet — drop a one-colour
 * PNG or SVG into `public/brands/` and fill the field in, and that brand
 * switches from a wordmark to its mark with no other change. Nothing here
 * invents a logo we have neither a file nor a licence for.
 */
const BRANDS: { name: string; logo?: string }[] = [
  { name: "Tuya" },
  { name: "Aqara" },
  { name: "Hikvision" },
  { name: "Sonoff" },
  { name: "Smart Life" },
  { name: "Zigbee" },
];

/**
 * One pass of the brand list.
 *
 * `min-w-[100vw]` is what makes the loop safe at any window size. The track
 * holds two of these and travels exactly one of them, so a pass narrower than
 * the screen would drag a bare patch of green behind the last name on a wide
 * monitor. Viewport units rather than a percentage because the track is
 * `w-max` — a percentage width inside a max-content box has nothing to resolve
 * against.
 *
 * `duplicate` marks the second copy decorative. Without it a screen reader
 * announces all six brands twice and the repeat sounds like a page fault.
 */
function BrandRow({ duplicate }: { duplicate?: boolean }) {
  return (
    <ul
      aria-hidden={duplicate}
      className={cn(
        "flex min-w-[100vw] shrink-0 items-center justify-around gap-x-10 px-5 sm:gap-x-14",
        // With the animation off, a pass wider than its container is simply cut
        // off — so reduced motion gets a plain centred list instead.
        "motion-reduce:w-full motion-reduce:min-w-0 motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-3",
        duplicate && "motion-reduce:hidden",
      )}
    >
      {BRANDS.map((brand) => (
        <li key={brand.name} className="shrink-0">
          {brand.logo ? (
            /* Forced to flat white. Partner logos are drawn for white paper and
               most of them disappear on a dark green band; a one-colour
               reversed treatment is what brand guidelines generally permit for
               exactly this placement, and it keeps six different marks looking
               like one row rather than six stickers. */
            <Image
              src={brand.logo}
              alt={brand.name}
              width={132}
              height={36}
              className="h-7 w-auto object-contain opacity-80 brightness-0 invert transition-opacity duration-300 hover:opacity-100"
            />
          ) : (
            <span className="font-display text-lg font-bold tracking-[-0.01em] text-white/80 transition-colors duration-300 hover:text-white sm:text-xl">
              {brand.name}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function BrandStrip() {
  return (
    /* Brand green, from the palette rather than Tailwind's emerald/teal
       defaults — those are a different hue to everything else on the page, so
       the band read as borrowed from another site. `brand-700` sits deliberately
       between the near-black hero above and the white shelf below, which is the
       job this strip has in the scroll. */
    <section
      aria-label="Brands we stock"
      className="relative z-10 overflow-hidden bg-brand-700 py-6"
    >
      {/* One soft highlight off the top-left so a full-bleed band of flat green
          has some light in it. A radial rather than a linear wash: a gradient
          stretched across the full width of a band this shallow bands visibly
          on an 8-bit display. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-32 size-80 rounded-full bg-brand-400/25 blur-3xl"
      />

      <div className="container-page relative flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
        {/* The rule-and-label shape the section headings already use, so this
            reads as a structural label for the row beside it rather than as one
            more badge. Static while the names move: a label that scrolls away
            is a label that has stopped explaining anything.

            The pulsing dot that was here is gone. A pulse means "live" — an
            unread order, a running job — and six brand names are not an event.
            It also never stops, which is exactly what a vestibular-sensitivity
            setting is asking you to turn off. */}
        <p className="flex shrink-0 items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200">
          <span aria-hidden="true" className="h-px w-5 bg-brand-300/60" />
          Brands we stock
        </p>

        {/* The mask is what separates a marquee from clipped overflow: names
            dissolve at both ends instead of being sliced by an invisible edge.
            The stops are kept tight so the readable middle stays as wide as
            possible. */}
        <div className="group relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          {/* Pauses under the cursor, so anyone who wants to read a name that
              is halfway past can stop it rather than wait 45 seconds for it to
              come round again. */}
          <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none">
            <BrandRow />
            <BrandRow duplicate />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The two-card promo row.
 *
 * `maxPercent` is the real best discount in the catalogue, measured by
 * `getDealStats()` — not a number typed into the markup. When nothing is
 * reduced it is null and the card sells the range instead of a saving, which is
 * the whole reason it is a prop: a hard-coded "Save up to 25%" keeps promising
 * a sale through every week there isn't one.
 */
export function PromoBand({ maxPercent }: { maxPercent: number | null }) {
  const hasDeals = maxPercent !== null && maxPercent > 0;

  return (
    <section className="container-page py-14 sm:py-20">
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Savings card — brand fill */}
        <Link
          href={hasDeals ? "/products?onSale=1" : "/products"}
          className="group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-lg bg-brand-600 p-8 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          {/* A single soft highlight off the top-left, so a 300px panel of flat
              brand green has some light in it. Kept as one radial rather than a
              linear gradient: a linear wash across a card this size bands
              visibly on an 8-bit display. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl"
          />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300 backdrop-blur-md">
              <Sparkles size={12} />
              {hasDeals ? "On sale now" : "Full range"}
            </span>

            {hasDeals ? (
              <>
                <p className="mt-5 font-display text-2xl font-bold leading-none tracking-[-0.01em] text-white/85">
                  Save up to
                </p>
                {/* The one genuinely large numeral on the page. `tabular-nums`
                    keeps the glyphs on the same metrics as the catalogue's
                    prices, and the percent sign is stepped down because at the
                    same size it competes with the number it qualifies. */}
                <p className="mt-1 font-display text-7xl font-black leading-[0.85] tracking-[-0.04em] tabular-nums text-amber-300">
                  {maxPercent}
                  <span className="align-top text-4xl tracking-normal">%</span>
                </p>
              </>
            ) : (
              <p className="mt-5 font-display text-4xl font-black leading-[1.05] tracking-[-0.025em]">
                The complete
                <br />
                range
              </p>
            )}

            <p className="mt-4 max-w-[22ch] text-sm leading-relaxed text-white/80">
              {hasDeals
                ? "Reduced across smart locks, alarm panels and automation."
                : "Smart locks, alarms, padlocks, switches, curtains and audio."}
            </p>
          </div>

          <span className="relative z-10 mt-6 inline-flex items-center gap-2 text-sm font-bold tracking-wide">
            {hasDeals ? "Shop deals" : "Browse everything"}
            <span className="flex size-7 items-center justify-center rounded-full bg-white/15 transition-all duration-300 group-hover:bg-white group-hover:text-brand-700">
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </span>
        </Link>

        {/* Highest rated — neutral container */}
        <Link
          href="/products?sort=rating"
          className="group relative flex min-h-[300px] flex-col justify-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-lg sm:p-10 lg:col-span-2"
        >
          <div className="relative z-10 max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-900">
              Top rated
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.025em] text-ink-950 sm:text-[2.6rem]">
              The ones people
              <br />
              rate highest
            </h2>
            {/* Was "trusted by thousands of South African homes and
                businesses" — a number nobody counted. Sorting by rating is a
                real, checkable claim about what the link does. */}
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-600">
              Sorted by customer rating, best first — so the top of the list is
              the kit our buyers actually recommend.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-ink-950 transition-colors group-hover:text-brand-600">
              View all
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

/**
 * The two category banners.
 *
 * `byCategory` is keyed by slug and holds the real best discount inside each
 * tree, so a card only claims a saving on a week one exists. The two subtitles
 * used to read "Up to 20% Off!" and "Up to 18% Off!" — numbers that were typed
 * here once and never checked against a price again.
 *
 * Each card keeps a `blurb` describing what is actually in the category, which
 * is true whether or not anything is reduced. That is what carries the card
 * when the discount line is absent, rather than leaving a hole where the offer
 * used to be.
 */
export function DealBanners({
  byCategory,
}: {
  byCategory: Record<string, number>;
}) {
  const deals = [
    {
      title: "Smart locks",
      blurb: "Fingerprint, facial recognition and keypad entry.",
      slug: "smart-locks",
      href: "/category/smart-locks",
      image: "/gigi.jpg",
      bgColor: "bg-ink-950",
      /* Matched to the card's own ground so the photo dissolves into it.
         Previously both cards masked the image with a flat `bg-ink-950`
         rectangle, which on the ink-900 card below showed up as a darker stripe
         down the middle of its own artwork. */
      fade: "from-ink-950 via-ink-950/55",
    },
    {
      title: "Alarms & detection",
      blurb: "Panels, sensors, sirens and smoke detection.",
      slug: "alarms-detection",
      href: "/category/alarms-detection",
      image: "/videoframe.png",
      bgColor: "bg-ink-900",
      fade: "from-ink-900 via-ink-900/55",
    },
  ];

  return (
    <section className="container-page py-14 sm:py-20">
      <div className="grid gap-5 sm:grid-cols-2">
        {deals.map((deal) => {
          const percent = byCategory[deal.slug];

          return (
            <Link
              key={deal.href}
              href={deal.href}
              className={`group relative flex min-h-[220px] flex-col justify-center overflow-hidden rounded-lg ${deal.bgColor} p-8 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:min-h-[260px]`}
            >
              <div className="relative z-10 max-w-[60%]">
                {/* The eyebrow states the offer only when there is one. Both
                    cards previously claimed to be "Today's Best Deal", which
                    they cannot both be. */}
                {percent ? (
                  <span className="inline-flex items-center rounded-full bg-accent-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
                    Up to {percent}% off
                  </span>
                ) : (
                  <span className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                    Shop the range
                  </span>
                )}

                <h3 className="mt-2.5 font-display text-2xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[1.75rem]">
                  {deal.title}
                </h3>
                <p className="mt-1.5 max-w-[26ch] text-sm leading-relaxed text-white/70">
                  {deal.blurb}
                </p>

                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink-950 shadow-sm transition-all duration-300 group-hover:bg-white/90">
                  Shop now
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              </div>

              <div className="absolute bottom-0 right-0 top-0 w-3/5 transition-transform duration-500 group-hover:scale-105 sm:w-1/2">
                <Image
                  fill
                  src={deal.image}
                  alt=""
                  sizes="(max-width: 640px) 60vw, 25vw"
                  className="object-cover"
                />
                {/* The card colour bleeding across the photo's left edge. A
                    gradient rather than the old solid block: it hides the seam
                    at any card width, and it keeps working when the copy beside
                    it runs long. */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${deal.fade} to-transparent`}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function LifestyleCta() {
  return (
    /* No vertical margin: the band is full-bleed and dark, so letting the
       neighbouring sections' own padding do the separating makes it read as a
       deliberate break in the page rather than a floating slab. */
    <section className="relative overflow-hidden bg-ink-950 py-20 sm:py-28">
      <div className="absolute inset-0">
        <Image
          fill
          src="/smart 2.png"
          alt=""
          sizes="100vw"
          className="object-cover opacity-35 filter saturate-[1.05]"
        />
      </div>

      {/* A left-weighted scrim. The copy occupies the left third and the
          photograph is worth seeing on the right, so darkening the whole frame
          evenly would cost the image for contrast the right side never needed. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/70 to-ink-950/20"
      />

      <div className="container-page relative z-10">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 backdrop-blur-md">
            <ShieldCheck size={14} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
              A new standard of security
            </span>
          </div>

          <h2 className="mt-5 font-display text-[2rem] font-black leading-[1.05] tracking-[-0.025em] text-white sm:text-5xl lg:text-[3.5rem]">
            Protect what matters, from anywhere.
          </h2>

          {/* The heading was the only thing in a 28rem-tall band, which is why
              it looked thin for its space. One line of substance under it, and
              it reads as a statement with a reason rather than a slogan. */}
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
            Lock up, arm the alarm and check who is at the door from your phone
            — whether you are upstairs or in another province.
          </p>

          <ButtonLink
            href="/products"
            size="lg"
            className="mt-8 border border-white/15 bg-white/5 text-white backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-white/30 hover:bg-white/10"
          >
            Explore all products
            <ArrowRight size={18} />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}