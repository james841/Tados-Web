/**
 * Search vocabulary shared by the header dropdown, the API route and the query
 * layer.
 *
 * Separate from `queries.ts` because that module is `server-only` — the client
 * needs the same threshold and the same term normalisation, and a search box
 * that disagreed with the server about what counts as a query would either fire
 * requests the server ignores or cache results under a key the server never
 * used.
 */

/**
 * How much someone has to type before a keystroke reaches the database.
 *
 * Three, not two. Every two-letter prefix on the way to a real word — "sm",
 * "do", "al" — matches a large slice of the catalogue, so it costs a query and
 * returns a list nobody wants. Three is the first length that usually means
 * something, and it roughly halves the number of round trips a typed word
 * produces.
 */
export const SEARCH_MIN_LENGTH = 3;

/**
 * How long typing has to stop before the request goes out.
 *
 * Comfortably longer than the gap between keystrokes for anyone typing at
 * speed, so a word is sent once when it's finished rather than once per letter,
 * and short enough that it still feels immediate.
 */
export const SEARCH_DEBOUNCE_MS = 220;

/** Six rows fit the dropdown without scrolling. More belongs on /search. */
export const SEARCH_SUGGESTION_LIMIT = 6;

/**
 * Deliberately smaller than `ProductCardData`.
 *
 * A dropdown row shows a thumbnail, a name, a category and a price. Reusing the
 * card shape would pull tagline, ratings, brand, flags, timestamps and a second
 * image on every keystroke — roughly three times the bytes off Supabase for
 * fields nothing renders.
 */
export interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  categoryName: string;
  inStock: boolean;
}

export interface SearchLanding {
  products: SearchSuggestion[];
  categories: { name: string; slug: string }[];
}

/**
 * Fold a raw query down to its cache key.
 *
 * "  Smart  LOCK " and "smart lock" are the same search, and treating them as
 * one term is what makes caching worth anything — otherwise every visitor's
 * capitalisation gets its own entry and nothing ever hits. Used on both sides,
 * so the browser's in-memory cache and Redis agree on what a search is.
 */
export function normaliseSearchTerm(raw: string) {
  return raw.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 60);
}
