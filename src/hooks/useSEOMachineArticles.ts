import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBlogCache } from './useRedisCache';
import type { Database } from '@/integrations/supabase/types';

type Article = Database['public']['Tables']['blog_articles']['Row'];

interface ArticleRequest {
  keyword: string;
  topic: string;
  targetAudience?: string;
  wordCount?: number;
}

interface GeneratedArticle {
  id: string;
  title: string;
  slug: string;
  wordCount: number;
  readingTime: number;
  keywords: string[];
}

/**
 * Génère un nouvel article de blog via Claude (Edge Function Supabase)
 */
export function useGenerateBlogArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ArticleRequest) => {
      // Appelle la Edge Function Supabase
      const { data, error } = await supabase.functions.invoke(
        'generate-blog-article',
        {
          body: {
            keyword: request.keyword,
            topic: request.topic,
            targetAudience: request.targetAudience,
            wordCount: request.wordCount || 1500,
          },
        }
      );

      if (error) {
        throw new Error(`Failed to generate article: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Article generation failed');
      }

      return data.article as GeneratedArticle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_articles'] });
    },
  });
}

/**
 * Liste tous les articles de blog avec statuts
 */
export function useBlogArticles() {
  return useQuery({
    queryKey: ['blog_articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*, blog_seo_metadata(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Article & { blog_seo_metadata: any[] })[];
    },
  });
}

/**
 * Publie un article de blog
 */
export function usePublishArticle() {
  const queryClient = useQueryClient();
  const { invalidateAllBlogCache } = useBlogCache();

  return useMutation({
    mutationFn: async (articleId: string) => {
      const { data, error } = await supabase
        .from('blog_articles')
        .update({ published_at: new Date().toISOString() })
        .eq('id', articleId)
        .select()
        .single();

      if (error) throw error;

      // Invalidate Redis cache asynchronously
      try {
        await supabase.functions.invoke('cache-invalidate', {
          body: {
            type: 'article',
            slug: (data as Article).slug,
          },
        });
        // Also clear local Redis cache
        await invalidateAllBlogCache();
      } catch (e) {
        console.warn('Failed to invalidate cache', e);
      }

      // Soumettre aux crawlers (optional - webhook)
      try {
        await fetch('/api/webhooks/google-indexing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: `/blog/${(data as Article).slug}`,
            type: 'URL_UPDATED',
          }),
        });
      } catch (e) {
        console.warn('Failed to notify Google', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_articles'] });
    },
  });
}

/**
 * Supprime un article (brouillon ou publié)
 */
export function useDeleteArticle() {
  const queryClient = useQueryClient();
  const { invalidateAllBlogCache } = useBlogCache();

  return useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;

      // Invalidate Redis cache asynchronously
      try {
        await supabase.functions.invoke('cache-invalidate', {
          body: {
            type: 'all',
          },
        });
        // Also clear local Redis cache
        await invalidateAllBlogCache();
      } catch (e) {
        console.warn('Failed to invalidate cache', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_articles'] });
    },
  });
}

/**
 * Met à jour manuellement le contenu d'un article
 */
export function useUpdateArticleContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      articleId,
      title,
      content,
      excerpt,
      imageUrl,
    }: {
      articleId: string;
      title?: string;
      content?: string;
      excerpt?: string;
      imageUrl?: string;
    }) => {
      const { data, error } = await supabase
        .from('blog_articles')
        .update({
          ...(title && { title }),
          ...(content && { content }),
          ...(excerpt && { excerpt }),
          ...(imageUrl && { image_url: imageUrl }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', articleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_articles'] });
    },
  });
}
