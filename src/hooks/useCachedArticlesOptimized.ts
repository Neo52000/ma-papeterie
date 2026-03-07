import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { cacheGetOrSet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-client';
import { useBlogCacheMetrics } from './useCacheMetrics';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Article = Database['public']['Tables']['blog_articles']['Row'];

/**
 * Hook to fetch blog articles with Redis caching
 * Replaces traditional useQuery for better performance
 */
export function useCachedArticlesOptimized(
  options?: Omit<UseQueryOptions, 'queryFn'>
) {
  const { trackArticleQuery } = useBlogCacheMetrics();

  return useQuery({
    queryKey: ['blog_articles', 'cached'],
    queryFn: async () => {
      const startTime = performance.now();

      return cacheGetOrSet<Article[]>(
        CACHE_KEYS.BLOG_ARTICLES_PUBLISHED,
        async () => {
          const { data, error } = await supabase
            .from('blog_articles')
            .select('*, blog_seo_metadata(*)')
            .eq('published_at', 'is.not.null')
            .order('created_at', { ascending: false });

          if (error) throw error;
          
          // Track DB miss
          const responseTime = performance.now() - startTime;
          await trackArticleQuery('miss', responseTime);
          
          return data as (Article & { blog_seo_metadata: any[] })[];
        },
        { ttl: CACHE_TTL.MEDIUM }
      );
    },
    staleTime: CACHE_TTL.MEDIUM * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Hook to fetch single article with caching
 */
export function useCachedArticleOptimized(
  slug: string,
  options?: Omit<UseQueryOptions, 'queryFn'>
) {
  const { trackArticleQuery } = useBlogCacheMetrics();

  return useQuery({
    queryKey: ['blog_article', slug, 'cached'],
    queryFn: async () => {
      const startTime = performance.now();

      return cacheGetOrSet<Article & { blog_seo_metadata: any[] }>(
        CACHE_KEYS.BLOG_ARTICLE_DETAIL(slug),
        async () => {
          const { data, error } = await supabase
            .from('blog_articles')
            .select('*, blog_seo_metadata(*)')
            .eq('slug', slug)
            .eq('published_at', 'is.not.null')
            .single();

          if (error) throw error;

          // Track DB miss
          const responseTime = performance.now() - startTime;
          await trackArticleQuery('miss', responseTime);

          return data;
        },
        { ttl: CACHE_TTL.MEDIUM }
      );
    },
    staleTime: CACHE_TTL.MEDIUM * 1000,
    ...options,
  });
}

/**
 * Hook to fetch articles by category with caching
 */
export function useCachedCategoryArticlesOptimized(
  category: string,
  options?: Omit<UseQueryOptions, 'queryFn'>
) {
  const { trackArticleQuery } = useBlogCacheMetrics();

  return useQuery({
    queryKey: ['blog_articles', 'category', category, 'cached'],
    queryFn: async () => {
      const startTime = performance.now();

      return cacheGetOrSet<Article[]>(
        CACHE_KEYS.BLOG_CATEGORY(category),
        async () => {
          const { data, error } = await supabase
            .from('blog_articles')
            .select('*, blog_seo_metadata(*)')
            .eq('category', category)
            .eq('published_at', 'is.not.null')
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Track DB miss
          const responseTime = performance.now() - startTime;
          await trackArticleQuery('miss', responseTime);

          return data as (Article & { blog_seo_metadata: any[] })[];
        },
        { ttl: CACHE_TTL.MEDIUM }
      );
    },
    staleTime: CACHE_TTL.MEDIUM * 1000,
    enabled: !!category,
    ...options,
  });
}
