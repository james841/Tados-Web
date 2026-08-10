import type { MetadataRoute } from "next";

import { SITE } from "@/lib/constants";

/**
 * PWA manifest, so an installed shortcut carries the Tados mark rather than a
 * generic browser glyph. The icons live in /public because the manifest needs
 * stable URLs — the 32px and 180px favicons are separate App Router file
 * conventions (src/app/icon.png, src/app/apple-icon.png).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — Smart Security & Home Automation`,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0C",
    theme_color: "#039855",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
