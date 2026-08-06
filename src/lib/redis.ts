import Redis from "ioredis";

/**
 * Redis cache layer.
 *
 * Design goals:
 *  - The site must never crash because Redis is down. Every helper degrades
 *    gracefully to an in-process Map, then to the database.
 *  - Lazy connect so `next build` does not hang waiting on a socket.
 */

const REDIS_ENABLED = process.env.REDIS_ENABLED !== "false";

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
  memoryCache: Map<string, { value: string; expiresAt: number }> | undefined;
};

/** In-memory fallback so caching still works without a Redis server. */
const memoryCache =
  globalForRedis.memoryCache ??
  new Map<string, { value: string; expiresAt: number }>();
if (process.env.NODE_ENV !== "production") {
  globalForRedis.memoryCache = memoryCache;
}

function createClient(): Redis | null {
  if (!REDIS_ENABLED) return null;

  try {
    const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1_000,
      retryStrategy(times) {
        // Stop hammering a server that clearly is not there.
        if (times > 3) return null;
        return Math.min(times * 200, 1_000);
      },
    });

    // Without a handler, a connection error becomes an unhandled exception.
    client.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") return;
      console.warn("[redis]", err.message);
    });

    client.connect().catch(() => {
      console.warn("[redis] unavailable — falling back to in-memory cache");
    });

    return client;
  } catch {
    return null;
  }
}

export const redis: Redis | null =
  globalForRedis.redis !== undefined ? globalForRedis.redis : createClient();
if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

function isReady(client: Redis | null): client is Redis {
  return client !== null && client.status === "ready";
}

// ---------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (isReady(redis)) {
      const hit = await redis.get(key);
      return hit ? (JSON.parse(hit) as T) : null;
    }
  } catch {
    /* fall through to memory */
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> {
  const payload = JSON.stringify(value);

  try {
    if (isReady(redis)) {
      await redis.set(key, payload, "EX", ttlSeconds);
      return;
    }
  } catch {
    /* fall through to memory */
  }

  memoryCache.set(key, {
    value: payload,
    expiresAt: Date.now() + ttlSeconds * 1_000,
  });
}

export async function cacheDelete(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    if (isReady(redis)) await redis.del(...keys);
  } catch {
    /* ignore */
  }
  keys.forEach((k) => memoryCache.delete(k));
}

/** Invalidate by prefix, e.g. `products:`. Uses SCAN, never KEYS. */
export async function cacheInvalidatePrefix(prefix: string): Promise<void> {
  try {
    if (isReady(redis)) {
      let cursor = "0";
      do {
        const [next, found] = await redis.scan(
          cursor,
          "MATCH",
          `${prefix}*`,
          "COUNT",
          200,
        );
        cursor = next;
        if (found.length) await redis.del(...found);
      } while (cursor !== "0");
    }
  } catch {
    /* ignore */
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
}

/**
 * Read-through cache wrapper.
 *
 *   const products = await cached("home:featured", 600, () => query())
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;

  const fresh = await loader();
  // Don't cache empty results for long — usually means the DB isn't seeded yet.
  await cacheSet(key, fresh, Array.isArray(fresh) && fresh.length === 0 ? 15 : ttlSeconds);
  return fresh;
}

/** Namespaced cache keys, kept in one place so invalidation stays honest. */
export const cacheKeys = {
  categoryTree: "categories:tree",
  featuredCategories: "categories:featured",
  homeBestsellers: "home:bestsellers",
  homeFeatured: "home:featured",
  homeNewArrivals: "home:new-arrivals",
  product: (slug: string) => `product:${slug}`,
  productRelated: (id: string) => `product:related:${id}`,
  categoryProducts: (slug: string, query: string) =>
    `category:${slug}:${query}`,
  brands: "brands:all",
  adminStats: "admin:stats",
  sitemapProducts: "sitemap:products",
} as const;

/** Call after any catalogue write so shoppers never see stale data. */
export async function invalidateCatalogueCache(): Promise<void> {
  await Promise.all([
    cacheInvalidatePrefix("categories:"),
    cacheInvalidatePrefix("home:"),
    cacheInvalidatePrefix("product:"),
    cacheInvalidatePrefix("category:"),
    cacheInvalidatePrefix("brands:"),
    cacheInvalidatePrefix("sitemap:"),
    cacheInvalidatePrefix("admin:"),
  ]);
}
