import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/supabase-functions';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AiCmoProfile {
  id: string;
  description: string | null;
  website: string | null;
  name_aliases: string[];
  llm_understanding: string | null;
  products: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiCmoCompetitor {
  id: string;
  name: string;
  website: string | null;
  weight: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AiCmoQuestion {
  id: string;
  prompt: string;
  prompt_type: 'product' | 'expertise';
  target_country: string | null;
  is_active: boolean;
  refresh_interval_seconds: number;
  last_run_at: string | null;
  next_run_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AiCmoPromptRun {
  id: string;
  question_id: string | null;
  llm_provider: string;
  llm_model: string;
  brand_mentioned: boolean | null;
  company_domain_rank: number | null;
  top_domain: string | null;
  raw_response: string | null;
  mentioned_pages: { url: string; title?: string }[];
  run_at: string | null;
  created_at: string;
  ai_cmo_questions?: { prompt: string } | null;
}

export interface AiCmoDashboardStats {
  id: string;
  ai_visibility_score: number;
  website_citation_share: number;
  total_runs: number;
  share_of_voice: { domain: string; count: number; percentage: number; type: string }[];
  computed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiCmoRecommendation {
  id: string;
  competitor_domain: string | null;
  prompts_to_analyze: string[];
  why_competitor: string | null;
  why_not_user: string | null;
  what_to_do: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiCmoLlmCost {
  id: string;
  model: string;
  call_type: string | null;
  date: string;
  cost: number;
  call_count: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  created_at: string;
}

// ── Profile (single-row upsert) ────────────────────────────────────────────

export const useAiCmoProfile = () =>
  useQuery({
    queryKey: ['ai-cmo-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_cmo_profiles')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data as AiCmoProfile | null;
    },
    staleTime: 5 * 60_000,
  });

export const useUpsertAiCmoProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Omit<AiCmoProfile, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      if (profile.id) {
        const { error } = await supabase
          .from('ai_cmo_profiles')
          .update({
            description: profile.description,
            website: profile.website,
            name_aliases: profile.name_aliases,
            llm_understanding: profile.llm_understanding,
            products: profile.products,
          })
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_cmo_profiles')
          .insert({
            description: profile.description,
            website: profile.website,
            name_aliases: profile.name_aliases,
            llm_understanding: profile.llm_understanding,
            products: profile.products,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-cmo-profile'] });
      toast.success('Profil AI-CMO sauvegardé');
    },
    onError: (err: Error) => {
      toast.error('Erreur lors de la sauvegarde du profil', { description: err.message });
    },
  });
};

// ── Competitors (delete-all + re-insert) ───────────────────────────────────

export const useAiCmoCompetitors = () =>
  useQuery({
    queryKey: ['ai-cmo-competitors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_cmo_competitors')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AiCmoCompetitor[];
    },
    staleTime: 5 * 60_000,
  });

export const useSaveAiCmoCompetitors = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (competitors: Omit<AiCmoCompetitor, 'id' | 'created_at' | 'updated_at'>[]) => {
      // Delete all existing
      const { error: delError } = await supabase
        .from('ai_cmo_competitors')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
      if (delError) throw delError;

      // Re-insert if any
      if (competitors.length > 0) {
        const { error: insError } = await supabase
          .from('ai_cmo_competitors')
          .insert(competitors);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-cmo-competitors'] });
      toast.success('Concurrents sauvegardés');
    },
    onError: (err: Error) => {
      toast.error('Erreur lors de la sauvegarde des concurrents', { description: err.message });
    },
  });
};

// ── Questions (upsert pattern — preserve IDs for FK) ───────────────────────

export const useAiCmoQuestions = () =>
  useQuery({
    queryKey: ['ai-cmo-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_cmo_questions')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AiCmoQuestion[];
    },
    staleTime: 5 * 60_000,
  });

export const useSaveAiCmoQuestions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      original,
      modified,
    }: {
      original: AiCmoQuestion[];
      modified: (Omit<AiCmoQuestion, 'id' | 'created_at' | 'updated_at'> & { id?: string })[];
    }) => {
      const originalIds = new Set(original.map((q) => q.id));
      const modifiedIds = new Set(modified.filter((q) => q.id).map((q) => q.id!));

      // Delete removed questions
      const toDelete = [...originalIds].filter((id) => !modifiedIds.has(id));
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('ai_cmo_questions')
          .delete()
          .in('id', toDelete);
        if (error) throw error;
      }

      // Upsert existing + new
      for (const q of modified) {
        const payload = {
          prompt: q.prompt,
          prompt_type: q.prompt_type,
          target_country: q.target_country,
          is_active: q.is_active,
          refresh_interval_seconds: q.refresh_interval_seconds,
          sort_order: q.sort_order,
        };

        if (q.id && originalIds.has(q.id)) {
          // Update existing
          const { error } = await supabase
            .from('ai_cmo_questions')
            .update(payload)
            .eq('id', q.id);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('ai_cmo_questions')
            .insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-cmo-questions'] });
      toast.success('Questions sauvegardées');
    },
    onError: (err: Error) => {
      toast.error('Erreur lors de la sauvegarde des questions', { description: err.message });
    },
  });
};

// ── Prompt Runs (read-only, paginated) ─────────────────────────────────────

export const useAiCmoPromptRuns = (page: number, pageSize = 20) =>
  useQuery({
    queryKey: ['ai-cmo-prompt-runs', page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('ai_cmo_prompt_runs')
        .select('*, ai_cmo_questions(prompt)', { count: 'exact' })
        .order('run_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { runs: (data ?? []) as AiCmoPromptRun[], total: count ?? 0 };
    },
    staleTime: 2 * 60_000,
  });

// ── Dashboard Stats (read-only, single row) ────────────────────────────────

export const useAiCmoDashboardStats = () =>
  useQuery({
    queryKey: ['ai-cmo-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_cmo_dashboard_stats')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data as AiCmoDashboardStats | null;
    },
    staleTime: 2 * 60_000,
  });

// ── Recommendations (read-only) ────────────────────────────────────────────

export const useAiCmoRecommendations = () =>
  useQuery({
    queryKey: ['ai-cmo-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_cmo_recommendations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AiCmoRecommendation[];
    },
    staleTime: 2 * 60_000,
  });

// ── Generate Recommendations (mutation) ────────────────────────────────────

export const useGenerateAiCmoRecommendations = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-cmo-recommendations', {
        body: {},
      });
      if (error) {
        throw new Error(
          await extractFunctionErrorMessage(error, 'Erreur lors de la génération des recommandations'),
        );
      }
      return data as { success: boolean; recommendations: number; domains_analyzed?: string[]; message?: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai-cmo-recommendations'] });
      qc.invalidateQueries({ queryKey: ['ai-cmo-llm-costs'] });
      if (data.recommendations === 0) {
        toast.info(data.message || 'Aucune recommandation générée');
      } else {
        toast.success(`${data.recommendations} recommandation${data.recommendations > 1 ? 's' : ''} générée${data.recommendations > 1 ? 's' : ''}`);
      }
    },
    onError: (err: Error) => {
      toast.error('Erreur lors de la génération des recommandations', { description: err.message });
    },
  });
};

// ── LLM Costs (read-only) ──────────────────────────────────────────────────

export const useAiCmoLlmCosts = () =>
  useQuery({
    queryKey: ['ai-cmo-llm-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_cmo_llm_costs')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AiCmoLlmCost[];
    },
    staleTime: 2 * 60_000,
  });
