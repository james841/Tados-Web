import type { MetadataRoute } from "next";

import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Never let crawlers burn budget on private or transactional routes.
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/checkout",
          "/checkout/",
          "/cart",
          "/login",
          "/register",
          "/account",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
