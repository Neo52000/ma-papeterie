import { useMutation, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Invalide toutes les clés liées au blog (admin + public) */
function invalidateAllBlog(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['blog_articles'] });
  queryClient.invalidateQueries({ queryKey: ['blog_articles_published'] });
  queryClient.invalidateQueries({ queryKey: ['blog_article'] });
  queryClient.invalidateQueries({ queryKey: ['related_articles'] });
}

// Helper: cast supabase to bypass stale generated types
const sb = supabase as any;

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  image_url: string | null;
  category: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  seo_machine_id: string | null;
  seo_machine_status: string | null;
}

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
      invalidateAllBlog(queryClient);
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
      const { data, error } = await sb
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

  return useMutation({
    mutationFn: async (articleId: string) => {
      const { data, error } = await sb
        .from('blog_articles')
        .update({ published_at: new Date().toISOString() })
        .eq('id', articleId)
        .select()
        .single();

      if (error) throw error;

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
      invalidateAllBlog(queryClient);
    },
  });
}

/**
 * Supprime un article (brouillon ou publié)
 */
export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await sb
        .from('blog_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllBlog(queryClient);
    },
  });
}

/**
 * Met à jour manuellement le contenu d'un article
 */
/**
 * Récupère les statistiques de vues par article
 */
export function useBlogArticleViewStats() {
  return useQuery({
    queryKey: ['blog_article_view_stats'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('blog_article_views')
        .select('article_id');

      if (error) throw error;

      // Aggregate views per article
      const viewMap = new Map<string, number>();
      let total = 0;
      (data || []).forEach((row: any) => {
        total++;
        viewMap.set(row.article_id, (viewMap.get(row.article_id) || 0) + 1);
      });

      return { viewMap, totalViews: total };
    },
    staleTime: 60_000, // refresh every minute
  });
}

/**
 * Dépublie un article (remet published_at à null)
 */
export function useUnpublishArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: string) => {
      const { data, error } = await sb
        .from('blog_articles')
        .update({ published_at: null })
        .eq('id', articleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllBlog(queryClient);
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
      const { data, error } = await sb
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
      invalidateAllBlog(queryClient);
    },
  });
}
