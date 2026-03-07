import { useCallback } from 'react';
import { cacheDelete, cacheDeletePattern, cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL, CacheOptions } from '@/lib/redis-client';

/**
 * React hook for Redis caching operations
 * Simplifies cache management in components
 */

export function useRedisCache() {
  const get = useCallback(async <T,>(key: string): Promise<T | null> => {
    return cacheGet<T>(key);
  }, []);

  const set = useCallback(async <T,>(
    key: string,
    value: T,
    options?: CacheOptions
  ) => {
    return cacheSet(key, value, options);
  }, []);

  const remove = useCallback(async (key: string) => {
    return cacheDelete(key);
  }, []);

  const removePattern = useCallback(async (pattern: string) => {
    return cacheDeletePattern(pattern);
  }, []);

  return {
    get,
    set,
    remove,
    removePattern,
    CACHE_KEYS,
    CACHE_TTL,
  };
}

/**
 * Hook for blog article caching
 */
export function useBlogCache() {
  const { get, set, removePattern, CACHE_KEYS, CACHE_TTL } = useRedisCache();

  return {
    // Get all published articles from cache
    getCachedArticles: () => get<any[]>(CACHE_KEYS.BLOG_ARTICLES_PUBLISHED),
    
    // Cache all published articles
    setCachedArticles: (articles: any[]) => 
      set(CACHE_KEYS.BLOG_ARTICLES_PUBLISHED, articles, { ttl: CACHE_TTL.MEDIUM }),
    
    // Get single article from cache
    getCachedArticle: (slug: string) => 
      get<any>(CACHE_KEYS.BLOG_ARTICLE_DETAIL(slug)),
    
    // Cache single article
    setCachedArticle: (slug: string, article: any) =>
      set(CACHE_KEYS.BLOG_ARTICLE_DETAIL(slug), article, { ttl: CACHE_TTL.MEDIUM }),
    
    // Get category articles from cache
    getCachedCategoryArticles: (category: string) =>
      get<any[]>(CACHE_KEYS.BLOG_CATEGORY(category)),
    
    // Cache category articles
    setCachedCategoryArticles: (category: string, articles: any[]) =>
      set(CACHE_KEYS.BLOG_CATEGORY(category), articles, { ttl: CACHE_TTL.MEDIUM }),
    
    // Invalidate ALL blog caches
    invalidateAllBlogCache: () =>
      removePattern('blog:*'),
    
    // Invalidate single article caches
    invalidateArticleCache: (slug: string) =>
      removePattern(`blog:article:${slug}*`),
  };
}

/**
 * Hook for product caching
 */
export function useProductCache() {
  const { get, set, removePattern, CACHE_KEYS, CACHE_TTL } = useRedisCache();

  return {
    getCachedBestsellers: () => get<any[]>(CACHE_KEYS.PRODUCTS_BESTSELLERS),
    setCachedBestsellers: (products: any[]) =>
      set(CACHE_KEYS.PRODUCTS_BESTSELLERS, products, { ttl: CACHE_TTL.LONG }),
    
    getCachedCategoryProducts: (slug: string) =>
      get<any[]>(CACHE_KEYS.PRODUCTS_CATEGORY(slug)),
    setCachedCategoryProducts: (slug: string, products: any[]) =>
      set(CACHE_KEYS.PRODUCTS_CATEGORY(slug), products, { ttl: CACHE_TTL.LONG }),
    
    getCachedProduct: (productId: string) =>
      get<any>(CACHE_KEYS.PRODUCT_DETAIL(productId)),
    setCachedProduct: (productId: string, product: any) =>
      set(CACHE_KEYS.PRODUCT_DETAIL(productId), product, { ttl: CACHE_TTL.LONG }),
    
    invalidateProductCache: (productId: string) =>
      removePattern(`product:${productId}*`),
    
    invalidateAllProductCache: () =>
      removePattern('products:*'),
  };
}

/**
 * Hook for pricing cache (B2B)
 */
export function usePricingCache() {
  const { get, set, removePattern, CACHE_KEYS, CACHE_TTL } = useRedisCache();

  return {
    getCachedSupplierPricing: (supplierName: string) =>
      get<any>(CACHE_KEYS.PRICING_SUPPLIER(supplierName)),
    setCachedSupplierPricing: (supplierName: string, pricing: any) =>
      set(CACHE_KEYS.PRICING_SUPPLIER(supplierName), pricing, { ttl: CACHE_TTL.SHORT }),
    
    getCachedDynamicPricing: (productId: string) =>
      get<any>(CACHE_KEYS.PRICING_DYNAMIC(productId)),
    setCachedDynamicPricing: (productId: string, pricing: any) =>
      set(CACHE_KEYS.PRICING_DYNAMIC(productId), pricing, { ttl: CACHE_TTL.SHORT }),
    
    invalidatePricingCache: (productId: string) =>
      removePattern(`pricing:*${productId}*`),
    
    invalidateAllPricingCache: () =>
      removePattern('pricing:*'),
  };
}
