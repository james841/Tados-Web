import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/providers";
import { GA_MEASUREMENT_ID, SITE } from "@/lib/constants";
import { resolveCurrency } from "@/lib/currency";
import { CURRENCY_COOKIE } from "@/lib/currency-shared";
import { getCategoryTree } from "@/lib/queries";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Smart Locks, Alarms & Home Automation South Africa`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "smart door lock South Africa",
    "facial recognition door lock",
    "fingerprint door lock",
    "smart security alarm system",
    "smart padlock",
    "smart U-lock",
    "Zigbee switch",
    "Wi-Fi switch",
    "ceiling speakers",
    "smart curtain kit",
    "smart smoke detector",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { telephone: true, address: true, email: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — Smart Security & Home Automation`,
    description: SITE.description,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — smart security and automation`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: `${SITE.name} — Smart Security & Home Automation`,
    description: SITE.description,
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  /**
   * src/app/icon.png and src/app/apple-icon.png are picked up automatically by
   * the App Router, so only the manifest needs declaring here. The old
   * favicon.ico was removed — it would otherwise take precedence over icon.png.
   */
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#039855",
  width: "device-width",
  initialScale: 1,
};

/** Organisation + WebSite JSON-LD, emitted once for the whole site. */
function OrganisationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        logo: `${SITE.url}/logo.png`,
        email: SITE.email,
        telephone: SITE.phone,
        /* No streetAddress: we don't publish one, and inventing it for the sake
           of a complete PostalAddress would put a false address in structured
           data that Google surfaces verbatim. City + region + country is valid
           on its own. */
        address: {
          "@type": "PostalAddress",
          addressLocality: SITE.address.city,
          addressRegion: SITE.address.province,
          addressCountry: SITE.address.country,
        },
        areaServed: SITE.cities.map((city) => ({
          "@type": "City",
          name: city,
        })),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        publisher: { "@id": `${SITE.url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE.url}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Google Analytics 4.
 *
 * `afterInteractive` rather than `beforeInteractive`: gtag.js loads once the
 * page is usable, so measurement never competes with the hero image for
 * bandwidth on a phone. Analytics is not worth a slower first paint.
 *
 * There is deliberately no route-change listener here. GA4's enhanced
 * measurement is on by default and already counts App Router navigations from
 * History API changes — sending a manual `page_view` as well double-counts
 * every page in the report, which is harder to spot than missing data.
 */
function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}

/**
 * Root layout.
 *
 * `async` so the header's category dropdown can be driven by the database
 * rather than a hardcoded list — an admin adding a category should see it in
 * the menu, not just on the homepage. The query is Redis-cached for an hour and
 * invalidated on every category write, so this costs nothing per request.
 *
 * The display currency is resolved here too, from the edge geo header plus any
 * manual override cookie. Doing it once at the root means every price on the
 * page agrees, and no component has to fetch a rate of its own.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [categories, requestHeaders, cookieStore] = await Promise.all([
    getCategoryTree(),
    headers(),
    cookies(),
  ]);

  const { currency, rate, available } = await resolveCurrency(
    requestHeaders,
    cookieStore.get(CURRENCY_COOKIE)?.value,
  );

  return (
    <html lang="en-ZA">
      <head>
        <link rel="preconnect" href="https://sandbox.payfast.co.za" />
        <OrganisationSchema />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <Providers
          currency={currency}
          rate={rate}
          availableCurrencies={available}
        >
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>

          <Header categories={categories} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
