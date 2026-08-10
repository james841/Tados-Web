import Image from "next/image";
import Link from "next/link";

import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The Tados brand lockup.
 *
 * Two artwork variants exist because the source is brushed silver, which only
 * measures ~2.4:1 against white — below the 3:1 AA threshold for graphics. The
 * `dark` variant scales the channels down (keeping the metallic gradient rather
 * than flattening it to a flat colour) to land near 8:1, and is the one to use
 * on light surfaces. The untouched silver is for dark surfaces like the footer.
 *
 * `priority` is on by default: the header logo is above the fold on every page,
 * so lazy-loading it just delays LCP.
 */
export function Logo({
  variant = "dark",
  className,
  priority = true,
  decorative = false,
}: {
  /** `dark` for light backgrounds, `light` for dark ones. */
  variant?: "dark" | "light";
  className?: string;
  priority?: boolean;
  /** Set when an ancestor already carries the accessible name. */
  decorative?: boolean;
}) {
  return (
    <Image
      src={
        variant === "dark"
          ? "/logo-horizontal-dark.png"
          : "/logo-horizontal.png"
      }
      alt={decorative ? "" : `${SITE.name} — excel solutions`}
      width={866}
      height={360}
      priority={priority}
      // Intrinsic ratio is 2.4:1, so height drives the size and width follows.
      className={cn("w-auto", className)}
    />
  );
}

/** The logo as the home link — the header and footer's shared entry point. */
export function LogoLink({
  variant = "dark",
  className,
  priority,
}: {
  variant?: "dark" | "light";
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name} home`}
      className="inline-flex shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      {/* The link's aria-label is the accessible name, so the image inside it
          must not repeat it. */}
      <Logo
        variant={variant}
        className={className}
        priority={priority}
        decorative
      />
    </Link>
  );
}
