import Link from "next/link";

import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The Tados brand lockup, drawn as vector rather than loaded as artwork.
 *
 * The supplied PNG had three problems no amount of CSS could fix: it was a
 * soft-edged raster that went visibly fuzzy at header size, it measured only
 * ~2.4:1 contrast in brushed silver (below the 3:1 AA floor for graphics), and
 * it had the previous operating name — "excel solutions" — baked into the
 * pixels. Rebuilding it as SVG solves all three and drops an image request from
 * every page, since the header logo is above the fold everywhere.
 *
 * On "black shining, no gradients": the shine here is optical rather than a
 * gradient fill. A solid near-black glyph carries a hairline lighter facet down
 * one edge of each stroke, which is how polished metal actually reads — a hard
 * specular break between two flat tones. Two solid colours, zero gradients, and
 * it stays crisp at any size because it is geometry, not pixels.
 */

/** Near-black rather than pure #000, which reads flat and slightly cheap. */
const INK = "#0A0A0A";
/** The facet: light enough to catch the eye, dark enough to still be "black". */
const FACET = "#454545";

export function Logo({
  variant = "dark",
  className,
  showTagline = false,
}: {
  /** `dark` = dark mark for light backgrounds. `light` = white mark for dark ones. */
  variant?: "dark" | "light";
  className?: string;
  /** Render "SMART TECHNOLOGY" beneath the wordmark. */
  showTagline?: boolean;
}) {
  const mark = variant === "light" ? "#FFFFFF" : INK;
  const facet = variant === "light" ? "rgba(255,255,255,0.42)" : FACET;

  return (
    <svg
      viewBox={showTagline ? "0 0 268 66" : "0 0 268 50"}
      aria-hidden="true"
      focusable="false"
      className={cn("w-auto", className)}
    >
      {/* ---- Monogram: the angular 7/T from the original mark, sharpened ---- */}
      {/* Top bar */}
      <path d="M2 5 H54 L48.5 19 H2 Z" fill={mark} />
      {/* Descending stem, raked like the source artwork */}
      <path d="M31 19 H48.5 L34.5 47 H16 Z" fill={mark} />
      {/* Specular facets — one hard edge per stroke, catching the light */}
      <path d="M2 5 H14.5 L11.5 19 H2 Z" fill={facet} />
      <path d="M31 19 H37.5 L23.5 47 H17 Z" fill={facet} />
      {/* The dot from the original lockup */}
      <circle cx="60" cy="11" r="6" fill={mark} />

      {/* ---- Wordmark ---- */}
      {/* The family comes from a class, not a presentation attribute: SVG
          presentation attributes don't evaluate var(), so font-family="var(…)"
          would silently fall back to the serif default. */}
      <text
        x="78"
        y="38"
        fill={mark}
        fontSize="37"
        fontWeight="800"
        letterSpacing="-1.4"
        className="font-sans"
      >
        tados
      </text>

      {showTagline ? (
        <text
          x="79"
          y="57"
          fill={variant === "light" ? "rgba(255,255,255,0.7)" : "#525252"}
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="4"
          className="font-sans"
        >
          SMART TECHNOLOGY
        </text>
      ) : null}
    </svg>
  );
}

/** The logo as the home link — the header and footer's shared entry point. */
export function LogoLink({
  variant = "dark",
  className,
  showTagline,
}: {
  variant?: "dark" | "light";
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name} home`}
      className="inline-flex shrink-0 items-center rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      {/* The link's aria-label is the accessible name, so the mark itself is
          aria-hidden — otherwise a screen reader announces it twice. */}
      <Logo variant={variant} className={className} showTagline={showTagline} />
    </Link>
  );
}
