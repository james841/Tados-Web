import { NextResponse } from "next/server";

import {
  SEARCH_MIN_LENGTH,
  normaliseSearchTerm,
} from "@/lib/search";
import { getSearchLanding, getSearchSuggestions } from "@/lib/queries";

/**
 * GET /api/search?q=… — the header dropdown's only endpoint.
 *
 * Every layer here exists to keep keystrokes off Supabase, because a search box
 * is the one control on a storefront that can fire a query per character typed:
 *
 *  1. The client waits for `SEARCH_MIN_LENGTH` characters and a pause in typing
 *     before it calls at all, and remembers what it has already asked for.
 *  2. This route folds the query to a canonical term, so "Smart Lock" and
 *     "  smart  lock " are one cache entry rather than two.
 *  3. Redis answers repeat terms for five minutes.
 *  4. The response is cacheable, so Vercel's edge answers the popular terms
 *     without the function running either.
 *
 * With no `q`, it returns the idle panel — bestsellers and category shortcuts,
 * cached for half an hour and the same for everybody, so opening the search box
 * costs nothing.
 */

export const runtime = "nodejs";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const term = normaliseSearchTerm(raw);

  try {
    if (term.length < SEARCH_MIN_LENGTH) {
      const landing = await getSearchLanding();

      return NextResponse.json(
        { mode: "landing" as const, query: term, ...landing },
        {
          headers: {
            // Long, because this payload is identical for every visitor and
            // changes only when the catalogue does.
            "Cache-Control":
              "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600",
          },
        },
      );
    }

    const products = await getSearchSuggestions(term);

    return NextResponse.json(
      { mode: "results" as const, query: term, products },
      {
        headers: {
          // `stale-while-revalidate` matters more than the max-age here: a
          // popular term keeps being served instantly while it refreshes behind
          // the request, so nobody waits on a query they share with everyone.
          "Cache-Control":
            "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    // A search box that breaks the header is worse than one that finds nothing.
    console.error("[api/search]", error);

    return NextResponse.json(
      { mode: "results" as const, query: term, products: [], categories: [] },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
