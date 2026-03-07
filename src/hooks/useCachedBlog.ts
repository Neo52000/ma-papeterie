import { useBlogCache } from './useRedisCache';
import { cacheGetOrSet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-client';

/**
 * Hook for cached blog operations
 * Integrates Redis caching with blog article queries
 */

export function useCachedBlogArticles() {
  const { setCachedArticles, invalidateAllBlogCache } = useBlogCache();

  const fetchArticles = async () => {
    // Use cache-aside pattern: try cache first, then fetch
    return cacheGetOrSet(
      CACHE_KEYS.BLOG_ARTICLES_PUBLISHED,
      async () => {
        const response = await fetch('/api/blog/articles?published=true');
        if (!response.ok) throw new Error('Failed to fetch articles');
        return response.json();
      },
      { ttl: CACHE_TTL.MEDIUM }
    );
  };

  return {
    fetchArticles,
    invalidateCache: invalidateAllBlogCache,
  };
}

/**
 * Hook for single cached blog article
 */
export function useCachedBlogArticle(slug: string) {
  const { setCachedArticle, invalidateArticleCache } = useBlogCache();

  const fetchArticle = async () => {
    return cacheGetOrSet(
      CACHE_KEYS.BLOG_ARTICLE_DETAIL(slug),
      async () => {
        const response = await fetch(`/api/blog/articles/${slug}`);
        if (!response.ok) throw new Error('Failed to fetch article');
        return response.json();
      },
      { ttl: CACHE_TTL.MEDIUM }
    );
  };

  return {
    fetchArticle,
    invalidateCache: () => invalidateArticleCache(slug),
  };
}

/**
 * Hook for caching article by category
 */
export function useCachedBlogCategory(category: string) {
  const { getCachedCategoryArticles, setCachedCategoryArticles } = useBlogCache();

  const fetchCategoryArticles = async () => {
    return cacheGetOrSet(
      CACHE_KEYS.BLOG_CATEGORY(category),
      async () => {
        const response = await fetch(`/api/blog/articles?category=${category}`);
        if (!response.ok) throw new Error('Failed to fetch category articles');
        return response.json();
      },
      { ttl: CACHE_TTL.MEDIUM }
    );
  };

  return {
    fetchCategoryArticles,
    getCached: getCachedCategoryArticles,
  };
}
