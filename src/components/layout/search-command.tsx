"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Price } from "@/components/currency/price";
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_LENGTH,
  normaliseSearchTerm,
  type SearchLanding,
  type SearchSuggestion,
} from "@/lib/search";
import { cn } from "@/lib/utils";

/**
 * The search palette.
 *
 * A sheet that drops from the header rather than an inline autocomplete, for one
 * practical reason: the header row is already full at 375px, and a search field
 * squeezed between the wordmark and the cart is a field nobody can type in. Open
 * it and the whole width is the search.
 *
 * ---------------------------------------------------------------------------
 * The egress budget
 * ---------------------------------------------------------------------------
 *
 * A search box is the one control on a storefront that can fire a database query
 * per character typed. Typing "smart lock" the naive way is ten queries from one
 * visitor. Four things stop that here, and they compound:
 *
 *  1. `SEARCH_MIN_LENGTH` — the first two characters never leave the browser.
 *     They match half the catalogue anyway, so the query would be paid for and
 *     the results thrown away.
 *  2. A debounce — the request goes out when typing pauses, not when a key goes
 *     down. Someone typing at speed sends one request for a word, not one per
 *     letter.
 *  3. An in-session cache — a term already fetched is answered from memory, so
 *     backspacing through a word (the most common thing anyone does in a search
 *     box) costs nothing at all.
 *  4. Abort — a request whose answer is already stale is cancelled rather than
 *     waited for, so a slow response can't overwrite a newer one.
 *
 * Behind those, the route caches each term in Redis for five minutes and sets
 * `stale-while-revalidate` for the CDN. Ten people searching "lock" in an hour
 * is one query against Supabase.
 *
 * "smart lock" typed straight through, at the end of all that: two requests, one
 * of which is likely a cache hit for everyone but the first person to search it.
 */

type SearchResponse =
  | ({ mode: "landing"; query: string } & SearchLanding)
  | { mode: "results"; query: string; products: SearchSuggestion[] };

/**
 * Terms already fetched this session.
 *
 * Module scope, not state: it survives the panel being closed and reopened,
 * which is exactly when a repeat search happens. Bounded, because a long
 * session should not grow a cache forever.
 */
const termCache = new Map<string, SearchSuggestion[]>();
const TERM_CACHE_LIMIT = 40;

function readCache(term: string) {
  return termCache.get(term) ?? null;
}

function writeCache(term: string, products: SearchSuggestion[]) {
  if (termCache.size >= TERM_CACHE_LIMIT) {
    // Oldest first — Map preserves insertion order.
    const oldest = termCache.keys().next().value;
    if (oldest !== undefined) termCache.delete(oldest);
  }
  termCache.set(term, products);
}

/** Landing payload is fetched once per page load and reused. */
let landingCache: SearchLanding | null = null;

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // The portal target only exists in the browser, so the first client render
  // has to match the server's (no panel) before the sheet can mount.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const panel = (
    <SearchPanel
      onClose={() => setOpen(false)}
      onNavigate={(href) => {
        setOpen(false);
        router.push(href);
      }}
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
        aria-label="Search products"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Search size={20} />
      </button>

      {/* Portalled to the body rather than rendered in place. The header is
          `sticky z-40`, which makes it a stacking context — a fixed overlay
          inside it can never paint above the cart drawer at z-50, however high
          its own z-index goes. */}
      {open && mounted ? createPortal(panel, document.body) : null}
    </>
  );
}

function SearchPanel({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [landing, setLanding] = useState<SearchLanding | null>(landingCache);
  const [results, setResults] = useState<SearchSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const term = normaliseSearchTerm(query);
  const isSearching = term.length >= SEARCH_MIN_LENGTH;
  const shortfall = SEARCH_MIN_LENGTH - term.length;

  const rows = isSearching ? (results ?? []) : (landing?.products ?? []);

  /* --- Idle payload: one fetch per page load, then memory. --------------- */
  useEffect(() => {
    if (landingCache) return;

    const controller = new AbortController();

    fetch("/api/search", { signal: controller.signal })
      .then((res) => res.json() as Promise<SearchResponse>)
      .then((body) => {
        if (body.mode !== "landing") return;
        landingCache = { products: body.products, categories: body.categories };
        setLanding(landingCache);
      })
      .catch(() => {
        /* An empty panel is a survivable outcome; a thrown header is not. */
      });

    return () => controller.abort();
  }, []);

  /* --- The typed query. -------------------------------------------------- */
  useEffect(() => {
    // Below the threshold nothing is fetched and nothing is shown as a result —
    // the panel falls back to the idle content it already has.
    if (!isSearching) {
      abortRef.current?.abort();
      setResults(null);
      setLoading(false);
      return;
    }

    const cachedRows = readCache(term);
    if (cachedRows) {
      abortRef.current?.abort();
      setResults(cachedRows);
      setLoading(false);
      setHighlight(0);
      return;
    }

    // Shown immediately, before the debounce elapses: the visitor gets feedback
    // on the keystroke while the request itself still waits for a pause.
    setLoading(true);

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(`/api/search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json() as Promise<SearchResponse>)
        .then((body) => {
          const products = body.mode === "results" ? body.products : [];
          writeCache(term, products);
          setResults(products);
          setHighlight(0);
          setLoading(false);
        })
        .catch((error: unknown) => {
          // An abort is the expected path, not a failure — a newer keystroke
          // cancelled this request and will set the state itself.
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setResults([]);
          setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, isSearching]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /* --- Focus, scroll lock, escape. --------------------------------------- */
  useEffect(() => {
    inputRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const goToResults = useCallback(() => {
    if (!term) return;
    onNavigate(`/search?q=${encodeURIComponent(term)}`);
  }, [term, onNavigate]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (rows.length === 0) return;
      event.preventDefault();

      setHighlight((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        // Wraps, so holding one arrow key can reach every row.
        const wrapped = (next + rows.length) % rows.length;

        listRef.current
          ?.querySelectorAll("[data-row]")
          [wrapped]?.scrollIntoView({ block: "nearest" });

        return wrapped;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[highlight];
      // Enter on a highlighted row opens it; Enter on raw text runs the full
      // search. Both are what the key looks like it should do at that moment.
      if (row) onNavigate(`/products/${row.slug}`);
      else goToResults();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close search"
        className="absolute inset-0 h-full w-full cursor-default bg-ink-950/45 animate-search-veil backdrop-blur-[2px] motion-reduce:animate-none"
        tabIndex={-1}
      />

      <div className="relative mx-auto w-full max-w-3xl px-3 pt-3 sm:px-6 sm:pt-6">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl animate-search-panel motion-reduce:animate-none">
          {/* Input. The ink bar makes the field the only thing on screen with
              weight, which is the whole reason the sheet exists. */}
          <div className="flex items-center gap-3 bg-ink-950 px-4 py-3.5 sm:px-5">
            <Search size={20} className="shrink-0 text-white/50" />

            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              type="search"
              // The browser's own history dropdown would cover these results.
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Search locks, cameras, alarms…"
              aria-label="Search products"
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/40 [&::-webkit-search-cancel-button]:hidden"
            />

            {loading ? (
              <Loader2
                size={16}
                className="shrink-0 animate-spin text-white/50 motion-reduce:animate-none"
              />
            ) : null}

            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X size={14} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="hidden shrink-0 rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white/50 transition-colors hover:text-white sm:block"
            >
              Esc
            </button>
          </div>

          <div ref={listRef} className="max-h-[70vh] overflow-y-auto">
            {isSearching ? (
              <ResultsSection
                term={term}
                rows={rows}
                loading={loading && results === null}
                highlight={highlight}
                onHighlight={setHighlight}
                onNavigate={onNavigate}
                onSeeAll={goToResults}
              />
            ) : (
              <LandingSection
                shortfall={shortfall}
                typed={term.length > 0}
                landing={landing}
                rows={rows}
                highlight={highlight}
                onHighlight={setHighlight}
                onNavigate={onNavigate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Idle: bestsellers and shortcuts
   --------------------------------------------------------------- */

function LandingSection({
  shortfall,
  typed,
  landing,
  rows,
  highlight,
  onHighlight,
  onNavigate,
}: {
  shortfall: number;
  typed: boolean;
  landing: SearchLanding | null;
  rows: SearchSuggestion[];
  highlight: number;
  onHighlight: (index: number) => void;
  onNavigate: (href: string) => void;
}) {
  return (
    <>
      {/* The threshold, made visible.
          Two characters in, the panel would otherwise sit there doing nothing
          and look broken. Saying what it's waiting for turns the rule that
          protects the database into an ordinary piece of interface. */}
      {typed ? (
        <div className="flex items-center gap-2.5 border-b border-ink-100 bg-brand-50/60 px-4 py-2.5 sm:px-5">
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: SEARCH_MIN_LENGTH }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "block h-1.5 w-4 rounded-full transition-colors",
                  index < SEARCH_MIN_LENGTH - shortfall
                    ? "bg-brand-600"
                    : "bg-brand-200",
                )}
              />
            ))}
          </span>
          <p className="text-xs font-medium text-brand-800">
            {shortfall === 1
              ? "One more character and we'll search"
              : `${shortfall} more characters and we'll search`}
          </p>
        </div>
      ) : null}

      {landing?.categories.length ? (
        <div className="border-b border-ink-100 px-4 py-3.5 sm:px-5">
          <SectionLabel>Browse</SectionLabel>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {landing.categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(`/category/${category.slug}`);
                }}
                className="rounded-full border border-ink-200 px-3.5 py-1.5 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-900 hover:bg-ink-950 hover:text-white"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="px-4 py-3.5 sm:px-5">
        <SectionLabel>Bestsellers</SectionLabel>

        {landing === null ? (
          <RowSkeletons />
        ) : rows.length === 0 ? (
          <p className="py-3 text-sm text-ink-500">
            Start typing to search the range.
          </p>
        ) : (
          <div className="mt-1.5">
            {rows.map((product, index) => (
              <ResultRow
                key={product.id}
                product={product}
                active={index === highlight}
                onMouseEnter={() => onHighlight(index)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------
   Typed: matches
   --------------------------------------------------------------- */

function ResultsSection({
  term,
  rows,
  loading,
  highlight,
  onHighlight,
  onNavigate,
  onSeeAll,
}: {
  term: string;
  rows: SearchSuggestion[];
  loading: boolean;
  highlight: number;
  onHighlight: (index: number) => void;
  onNavigate: (href: string) => void;
  onSeeAll: () => void;
}) {
  if (loading) {
    return (
      <div className="px-4 py-3.5 sm:px-5">
        <SectionLabel>Searching</SectionLabel>
        <RowSkeletons />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-10 text-center sm:px-5">
        <p className="text-sm font-semibold text-ink-900">
          Nothing matches “{term}”
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-500">
          Try a shorter word, or the type of product rather than the model name.
        </p>
        <button
          type="button"
          onClick={onSeeAll}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
        >
          Search the full catalogue
          <ArrowRight size={15} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-3.5 sm:px-5">
        <SectionLabel>
          {rows.length} {rows.length === 1 ? "match" : "matches"}
        </SectionLabel>
        <div className="mt-1.5">
          {rows.map((product, index) => (
            <ResultRow
              key={product.id}
              product={product}
              active={index === highlight}
              onMouseEnter={() => onHighlight(index)}
              onNavigate={onNavigate}
              term={term}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onSeeAll}
        className="flex w-full items-center justify-between gap-3 border-t border-ink-100 bg-ink-50 px-4 py-3.5 text-left transition-colors hover:bg-ink-100 sm:px-5"
      >
        <span className="text-sm font-semibold text-ink-900">
          See everything for “{term}”
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
          <CornerDownLeft size={13} />
          Enter
        </span>
      </button>
    </>
  );
}

/* ---------------------------------------------------------------
   Pieces
   --------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
      {children}
    </p>
  );
}

function ResultRow({
  product,
  active,
  term,
  onMouseEnter,
  onNavigate,
}: {
  product: SearchSuggestion;
  active: boolean;
  term?: string;
  onMouseEnter: () => void;
  onNavigate: (href: string) => void;
}) {
  const href = `/products/${product.slug}`;

  return (
    <Link
      href={href}
      data-row
      onMouseEnter={onMouseEnter}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors sm:gap-3.5",
        active ? "bg-ink-100" : "hover:bg-ink-50",
      )}
    >
      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-ink-100 sm:size-14">
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            // Small and fixed, so the browser fetches a thumbnail rather than a
            // full-size product photo for a 56px box.
            sizes="56px"
            className="object-cover"
          />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900">
          {term ? <Highlighted text={product.name} term={term} /> : product.name}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
          <span className="truncate">{product.categoryName}</span>
          {!product.inStock ? (
            <span className="shrink-0 font-semibold text-accent-700">
              Out of stock
            </span>
          ) : null}
        </span>
      </span>

      <Price
        price={product.price}
        compareAtPrice={product.compareAtPrice}
        size="sm"
        showBase={false}
        className="shrink-0 justify-end"
      />
    </Link>
  );
}

/**
 * The matched span, in bold.
 *
 * Answers the question a result list always raises — why is this here? — which
 * matters most when the match is in a word the eye skips over.
 */
function Highlighted({ text, term }: { text: string; term: string }) {
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  if (at === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-bold text-ink-950">
        {text.slice(at, at + term.length)}
      </mark>
      {text.slice(at + term.length)}
    </>
  );
}

function RowSkeletons() {
  return (
    <div className="mt-1.5" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3.5 px-2 py-2.5">
          <div className="skeleton size-12 shrink-0 rounded-lg sm:size-14" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
