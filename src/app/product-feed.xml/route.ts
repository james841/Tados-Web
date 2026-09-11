import { buildMerchantFeed } from "@/lib/merchant-feed";
import { getMerchantFeedProducts } from "@/lib/queries";

/**
 * `/product-feed.xml` — the URL to paste into Google Merchant Center under
 * "Add products from file → Enter a link to your file".
 *
 * The directory is literally named `product-feed.xml` so the route serves that
 * exact path. Merchant Center fetches it on its own schedule (daily by
 * default), which is why it has to be a plain public GET with no auth: leave
 * the username and password fields in Merchant Center blank.
 */

/**
 * Rebuilt hourly at most. Merchant Center only fetches once a day, so this is
 * really about the incidental traffic — a curious crawler shouldn't be able to
 * make the site re-query the whole catalogue on every request.
 *
 * Price and stock edits don't wait for it: `invalidateCatalogueCache()` clears
 * the `sitemap:` prefix on every catalogue write, and the feed's cache key
 * lives under it.
 */
export const revalidate = 3600;

export async function GET() {
  const feed = buildMerchantFeed(await getMerchantFeedProducts());

  return new Response(feed.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Visible in a HEAD request, so the item count can be checked without
      // downloading and eyeballing the whole document.
      "X-Feed-Items": String(feed.included),
      "X-Feed-Skipped": String(feed.skipped),
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
