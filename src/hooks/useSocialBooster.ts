import { useMutation, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Helper: cast supabase to bypass stale generated types
const sb = supabase as unknown as typeof supabase;

// ── Types ───────────────────────────────────────────────────────────────────

export interface SocialCampaign {
  id: string;
  article_id: string;
  status: string;
  classification: {
    universe: string;
    seasonality: string | null;
    need_type: string;
    usage: string;
    main_angle: string;
  } | null;
  entity_matches: EntityMatch[] | null;
  selected_entity: EntityMatch | null;
  utm_params: { source: string; medium: string; campaign: string } | null;
  created_at: string;
  updated_at: string;
}

export interface EntityMatch {
  entity_type: string;
  entity_id: string;
  entity_label: string;
  match_score: number;
  match_reason: string;
}

export interface SocialPost {
  id: string;
  campaign_id: string;
  platform: 'facebook' | 'instagram' | 'x' | 'linkedin' | 'whatsapp';
  content: string;
  hashtags: string[];
  cta_text: string | null;
  cta_url: string | null;
  media_url: string | null;
  status: string;
  external_post_id: string | null;
  published_at: string | null;
  scheduled_for: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialSettings {
  id: string;
  enabled: boolean;
  active_platforms: string[];
  default_mode: string;
  default_ctas: string[];
  utm_source: string;
  utm_medium: string;
  utm_campaign_prefix: string;
  ai_provider: string;
  ai_model: string;
}

export interface PublicationLog {
  id: string;
  post_id: string;
  action: string;
  status: string;
  response_data: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// ── Invalidation helpers ────────────────────────────────────────────────────

function invalidateSocial(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['social_campaigns'] });
  qc.invalidateQueries({ queryKey: ['social_campaign'] });
  qc.invalidateQueries({ queryKey: ['social_posts'] });
}

// ── Hooks ───────────────────────────────────────────────────────────────────

/** Fetch social campaign + posts for a specific article */
export function useSocialCampaign(articleId: string | null) {
  return useQuery({
    queryKey: ['social_campaign', articleId],
    enabled: !!articleId,
    queryFn: async () => {
      const { data: campaign, error } = await (sb
        .from('social_campaigns' as any) as any)
        .select('*')
        .eq('article_id', articleId)
        .maybeSingle();

      if (error) throw error;
      if (!campaign) return null;

      const { data: posts, error: postsError } = await (sb
        .from('social_posts' as any) as any)
        .select('*')
        .eq('campaign_id', (campaign as any).id)
        .order('platform');

      if (postsError) throw postsError;

      return { campaign: campaign as SocialCampaign, posts: (posts || []) as SocialPost[] };
    },
  });
}

/** Fetch all social campaigns with article info */
export function useSocialCampaigns() {
  return useQuery({
    queryKey: ['social_campaigns'],
    queryFn: async () => {
      const { data, error } = await (sb
        .from('social_campaigns' as any) as any)
        .select('*, blog_articles(id, title, slug, image_url, published_at), social_posts(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (SocialCampaign & {
        blog_articles: { id: string; title: string; slug: string; image_url: string | null; published_at: string | null };
        social_posts: SocialPost[];
      })[];
    },
  });
}

/** Generate social posts for an article via edge function */
export function useGenerateSocialPosts() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ articleId, force }: { articleId: string; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('generate-social-posts', {
        body: { article_id: articleId, force },
      });

      if (error) throw new Error(`Generation failed: ${error.message}`);
      if (!data.success) throw new Error(data.error || 'Generation failed');

      return data as {
        campaign_id: string;
        classification: SocialCampaign['classification'];
        entity_matches: EntityMatch[];
        posts: SocialPost[];
        already_generated?: boolean;
      };
    },
    onSuccess: () => invalidateSocial(qc),
  });
}

/** Update a social post's content, CTA, or hashtags */
export function useUpdateSocialPost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      cta_text,
      hashtags,
    }: {
      postId: string;
      content?: string;
      cta_text?: string;
      hashtags?: string[];
    }) => {
      const updates: Record<string, unknown> = {};
      if (content !== undefined) updates.content = content;
      if (cta_text !== undefined) updates.cta_text = cta_text;
      if (hashtags !== undefined) updates.hashtags = hashtags;

      const { data, error } = await (sb
        .from('social_posts' as any) as any)
        .update(updates)
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;
      return data as SocialPost;
    },
    onSuccess: () => invalidateSocial(qc),
  });
}

/** Approve a social post (draft → approved) */
export function useApproveSocialPost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await (sb
        .from('social_posts' as any) as any)
        .update({ status: 'approved' })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;

      // Log approval
      await (sb.from('social_publication_logs' as any) as any).insert({
        post_id: postId,
        action: 'approve',
        status: 'success',
      });

      return data as SocialPost;
    },
    onSuccess: () => invalidateSocial(qc),
  });
}

/** Publish a social post via edge function */
export function usePublishSocialPost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke('publish-social-post', {
        body: { post_id: postId },
      });

      if (error) throw new Error(`Publication failed: ${error.message}`);
      if (!data.success) throw new Error(data.error || 'Publication failed');

      return data;
    },
    onSuccess: () => invalidateSocial(qc),
  });
}

/** Skip a social post for a platform */
export function useSkipSocialPost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await (sb
        .from('social_posts' as any) as any)
        .update({ status: 'skipped' })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;

      await (sb.from('social_publication_logs' as any) as any).insert({
        post_id: postId,
        action: 'skip',
        status: 'success',
      });

      return data as SocialPost;
    },
    onSuccess: () => invalidateSocial(qc),
  });
}

/** Update selected entity for a campaign */
export function useUpdateCampaignEntity() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      selectedEntity,
    }: {
      campaignId: string;
      selectedEntity: EntityMatch | null;
    }) => {
      const { data, error } = await (sb
        .from('social_campaigns' as any) as any)
        .update({ selected_entity: selectedEntity })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      return data as SocialCampaign;
    },
    onSuccess: () => invalidateSocial(qc),
  });
}

/** Fetch social settings */
export function useSocialSettings() {
  return useQuery({
    queryKey: ['social_settings'],
    queryFn: async () => {
      const { data, error } = await (sb
        .from('social_settings' as any) as any)
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as SocialSettings;
    },
  });
}

/** Update social settings */
export function useUpdateSocialSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<SocialSettings>) => {
      const { data: existing } = await (sb
        .from('social_settings' as any) as any)
        .select('id')
        .limit(1)
        .single();

      if (!existing) throw new Error('Settings not found');

      const { data, error } = await (sb
        .from('social_settings' as any) as any)
        .update(updates)
        .eq('id', (existing as any).id)
        .select()
        .single();

      if (error) throw error;
      return data as SocialSettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social_settings'] });
    },
  });
}

/** Fetch publication logs for a post */
export function useSocialPublicationLogs(postId: string | null) {
  return useQuery({
    queryKey: ['social_pub_logs', postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await (sb
        .from('social_publication_logs' as any) as any)
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PublicationLog[];
    },
  });
}
