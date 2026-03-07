import { kv } from '@vercel/kv';

/**
 * Redis-based caching utilities for ma-papeterie
 * Uses Vercel KV for simplicity (1000 ops/day free)
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await kv.get<T>(key);
    return value || null;
  } catch (error) {
    console.error(`[Redis] Error getting key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<void> {
  try {
    if (options?.ttl) {
      await kv.setex(key, options.ttl, JSON.stringify(value));
    } else {
      await kv.set(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error(`[Redis] Error setting key ${key}:`, error);
  }
}

/**
 * Delete cache key
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await kv.del(key);
  } catch (error) {
    console.error(`[Redis] Error deleting key ${key}:`, error);
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const keys = await kv.keys(pattern);
    if (keys.length > 0) {
      await kv.del(...keys);
    }
  } catch (error) {
    console.error(`[Redis] Error deleting pattern ${pattern}:`, error);
  }
}

/**
 * Increment counter
 */
export async function cacheIncrement(key: string, amount = 1): Promise<number> {
  try {
    return await kv.incrby(key, amount);
  } catch (error) {
    console.error(`[Redis] Error incrementing key ${key}:`, error);
    return 0;
  }
}

/**
 * Get or set (cache aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  try {
    // Try to get from cache first
    const cached = await cacheGet<T>(key);
    if (cached) {
      return cached;
    }

    // Not in cache, fetch it
    const value = await fetchFn();

    // Store in cache
    await cacheSet(key, value, options);

    return value;
  } catch (error) {
    console.error(`[Redis] Error in cache-aside for key ${key}:`, error);
    // If cache fails, at least return the fetched value
    return await fetchFn();
  }
}

/**
 * Cache Statistics (for monitoring)
 */
export async function getCacheStats(): Promise<{
  isAvailable: boolean;
  info?: string;
}> {
  try {
    // Vercel KV doesn't expose stats easily, so we just check if it's available
    await kv.ping();
    return { isAvailable: true };
  } catch (error) {
    console.warn('[Redis] Cache unavailable:', error);
    return { isAvailable: false };
  }
}

/**
 * Cache Keys for the application
 */
export const CACHE_KEYS = {
  // Blog
  BLOG_ARTICLES_PUBLISHED: 'blog:articles:published',
  BLOG_ARTICLE_DETAIL: (slug: string) => `blog:article:${slug}`,
  BLOG_CATEGORY: (category: string) => `blog:category:${category}`,
  BLOG_ARTICLE_VIEWS: (articleId: string) => `blog:article:${articleId}:views`,

  // Products
  PRODUCTS_BESTSELLERS: 'products:bestsellers',
  PRODUCTS_CATEGORY: (slug: string) => `products:category:${slug}`,
  PRODUCT_DETAIL: (productId: string) => `product:${productId}`,
  PRODUCT_STOCK: (productId: string) => `stock:product:${productId}`,

  // Pricing (B2B)
  PRICING_SUPPLIER: (supplierName: string) => `pricing:supplier:${supplierName}`,
  PRICING_DYNAMIC: (productId: string) => `pricing:dynamic:${productId}`,

  // Analytics
  ANALYTICS_SUMMARY: 'analytics:summary',
  ANALYTICS_DAILY: (date: string) => `analytics:daily:${date}`,
} as const;

/**
 * Cache TTLs (Time to Live in seconds)
 */
export const CACHE_TTL = {
  SHORT: 5 * 60, // 5 minutes (stock, dynamic pricing)
  MEDIUM: 30 * 60, // 30 minutes (articles lists, products)
  LONG: 60 * 60, // 1 hour (category pages)
  VERY_LONG: 6 * 60 * 60, // 6 hours (homepage)
} as const;
