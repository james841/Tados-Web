import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Payfast's own mark, wherever the site needs to say who takes the money.
 *
 * **The vector file, not a recolour.** `public/payfast-logo.svg` is Payfast's
 * published lockup — blue wordmark, pink chevron, `by network` underneath. It is
 * a third party's trademark, so it is reproduced as supplied. Tinting it to
 * match our green, or knocking it out to white, would be a redrawn version of
 * someone else's logo: both a brand-guideline breach and a small lie about what
 * the customer is about to see on the gateway's own page.
 *
 * **Two grounds, because the logo keeps its colours.** `#0069b1` on the
 * near-black footer is a murky 3:1, so there it gets the white plate every
 * payment brand asks for. On the checkout card that plate would be invisible
 * against white, so `variant="bare"` drops it — same asset, no floating
 * rectangle.
 *
 * **`unoptimized`.** The image optimiser refuses SVG unless
 * `dangerouslyAllowSVG` is set, which would loosen that setting site-wide for
 * every remote host in `next.config.ts` — for a 7 KB vector with nothing to
 * optimise. This bypasses the optimiser for one file instead.
 */
export function PayFastMark({
  className,
  label,
  variant = "plate",
}: {
  className?: string;
  /** Caption set beside the mark. Omit to render it on its own. */
  label?: string;
  /** `plate` for dark backgrounds, `bare` for light ones. */
  variant?: "plate" | "bare";
}) {
  return (
    <span className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {label ? <span>{label}</span> : null}
      <span
        className={cn(
          "inline-flex items-center",
          variant === "plate" && "rounded-md bg-white px-2.5 py-1.5 shadow-sm",
        )}
      >
        <Image
          src="/payfast-logo.svg"
          alt="Payfast"
          width={112}
          height={40}
          unoptimized
          className="h-6 w-auto"
        />
      </span>
    </span>
  );
}
