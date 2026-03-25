import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SocialPost, SocialCampaign } from './useSocialBooster';

// Helper: cast supabase to bypass stale generated types
const sb = supabase as unknown as typeof supabase;

// ── Types ───────────────────────────────────────────────────────────────────

export interface StandaloneCampaign extends SocialCampaign {
  title: string | null;
  source_type: 'standalone' | 'editorial_calendar';
  raw_context: {
    product?: string;
    promo?: string;
    occasion?: string;
    tone?: string;
    description?: string;
  } | null;
  media_urls: string[] | null;
  media_type: 'image' | 'video' | 'carousel' | null;
  social_posts: SocialPost[];
}

export interface EditorialCalendar {
  id: string;
  month: string;
  ideas: CalendarIdea[];
  generated_by: string;
  ai_model: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarIdea {
  suggested_date: string;
  theme: string;
  platforms: string[];
  tone: string;
  description: string;
  content_type: string;
}

// ── Invalidation helpers ────────────────────────────────────────────────────

function invalidateStandalone(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['social_standalone_campaigns'] });
  qc.invalidateQueries({ queryKey: ['social_calendar_posts'] });
  qc.invalidateQueries({ queryKey: ['social_campaigns'] });
  qc.invalidateQueries({ queryKey: ['social_campaign'] });
}

// ── Hooks ───────────────────────────────────────────────────────────────────

/** Fetch all standalone campaigns with their posts */
export function useStandaloneCampaigns() {
  return useQuery({
    queryKey: ['social_standalone_campaigns'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from('social_campaigns')
        .select('*, social_posts(*)')
        .in('source_type', ['standalone', 'editorial_calendar'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StandaloneCampaign[];
    },
  });
}

/** Create a new standalone campaign */
export function useCreateStandaloneCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      rawContext,
      mediaUrls,
      mediaType,
      sourceType = 'standalone',
    }: {
      title: string;
      rawContext: StandaloneCampaign['raw_context'];
      mediaUrls?: string[];
      mediaType?: 'image' | 'video' | 'carousel';
      sourceType?: 'standalone' | 'editorial_calendar';
    }) => {
      const { data, error } = await sb
        .from('social_campaigns')
        .insert({
          source_type: sourceType,
          title,
          raw_context: rawContext,
          media_urls: mediaUrls || [],
          media_type: mediaType || null,
          status: 'detected',
        })
        .select()
        .single();

      if (error) throw error;
      return data as StandaloneCampaign;
    },
    onSuccess: () => invalidateStandalone(qc),
  });
}

/** Generate captions for a standalone campaign via edge function */
export function useGenerateSocialCaptions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-social-captions', {
        body: { campaign_id: campaignId },
      });

      if (error) throw new Error(`Generation failed: ${error.message}`);
      if (!data.success) throw new Error(data.error || 'Generation failed');

      return data as {
        campaign_id: string;
        posts: SocialPost[];
      };
    },
    onSuccess: () => invalidateStandalone(qc),
  });
}

/** Schedule a social post (set scheduled_for + status) */
export function useScheduleSocialPost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      scheduledFor,
    }: {
      postId: string;
      scheduledFor: string; // ISO date string
    }) => {
      const { data, error } = await sb
        .from('social_posts')
        .update({ scheduled_for: scheduledFor, status: 'scheduled' })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;

      await sb.from('social_publication_logs').insert({
        post_id: postId,
        action: 'schedule',
        status: 'success',
        response_data: { scheduled_for: scheduledFor },
      });

      return data as SocialPost;
    },
    onSuccess: () => invalidateStandalone(qc),
  });
}

/** Fetch all posts for a given month (calendar view) */
export function useCalendarPosts(month: string) {
  return useQuery({
    queryKey: ['social_calendar_posts', month],
    enabled: !!month,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const monthStart = `${month}-01T00:00:00`;
      const [year, m] = month.split('-');
      const nextMonth = Number(m) === 12
        ? `${Number(year) + 1}-01-01T00:00:00`
        : `${year}-${String(Number(m) + 1).padStart(2, '0')}-01T00:00:00`;

      // Fetch posts scheduled or published within this month
      const { data, error } = await sb
        .from('social_posts')
        .select('*, social_campaigns!inner(id, title, source_type, article_id)')
        .or(
          `and(scheduled_for.gte.${monthStart},scheduled_for.lt.${nextMonth}),` +
          `and(published_at.gte.${monthStart},published_at.lt.${nextMonth})`
        );

      if (error) throw error;
      return (data || []) as (SocialPost & {
        social_campaigns: { id: string; title: string | null; source_type: string; article_id: string | null };
      })[];
    },
  });
}

/** Fetch editorial calendar for a given month */
export function useEditorialCalendar(month: string) {
  return useQuery({
    queryKey: ['editorial_calendar', month],
    enabled: !!month,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from('social_editorial_calendar')
        .select('*')
        .eq('month', `${month}-01`)
        .maybeSingle();

      if (error) throw error;
      return data as EditorialCalendar | null;
    },
  });
}

/** Generate editorial calendar via edge function */
export function useGenerateEditorialCalendar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ month, context }: { month: string; context?: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-editorial-calendar', {
        body: { month, context },
      });

      if (error) throw new Error(`Calendar generation failed: ${error.message}`);
      if (!data.success) throw new Error(data.error || 'Calendar generation failed');

      return data as {
        calendar_id: string;
        month: string;
        ideas_count: number;
        ideas: CalendarIdea[];
      };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['editorial_calendar', vars.month] });
    },
  });
}

/** Convert an editorial calendar idea to a standalone campaign */
export function useConvertIdeaToCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (idea: CalendarIdea) => {
      const { data, error } = await sb
        .from('social_campaigns')
        .insert({
          source_type: 'editorial_calendar',
          title: idea.theme,
          raw_context: {
            description: idea.description,
            tone: idea.tone,
            occasion: idea.content_type,
          },
          status: 'detected',
        })
        .select()
        .single();

      if (error) throw error;
      return data as StandaloneCampaign;
    },
    onSuccess: () => invalidateStandalone(qc),
  });
}
