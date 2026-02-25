import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PriceCurrent {
  product_id: string;
  pack_size: number;
  best_price: number | null;
  best_competitor_id: string | null;
  updated_at: string;
  sample_count: number;
  competitor?: {
    name: string;
    base_url: string;
  };
}

export interface PriceSnapshot {
  id: string;
  product_id: string;
  competitor_id: string;
  pack_size: number;
  price: number;
  currency: string;
  scraped_at: string;
  source_url: string | null;
  is_suspect: boolean;
  competitor?: {
    name: string;
    base_url: string;
  };
}

export interface ScrapeRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  offers_saved: number;
  errors_count: number;
  details: Record<string, unknown> | null;
}

export interface Competitor {
  id: string;
  name: string;
  base_url: string;
  enabled: boolean;
  price_selector: string | null;
  rate_limit_ms: number | null;
  delivery_cost: number | null;
}

export interface CompetitorProductMap {
  id: string;
  product_id: string;
  competitor_id: string;
  product_url: string;
  pack_size: number;
  active: boolean;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  competitor?: Competitor;
  product?: {
    id: string;
    name: string;
    ean: string | null;
  };
}

// Hook pour récupérer les meilleurs prix d'un produit
export const useProductBestPrices = (productId: string) => {
  return useQuery({
    queryKey: ['price-current', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_current')
        .select(`
          *,
          competitor:competitors(name, base_url)
        `)
        .eq('product_id', productId);

      if (error) throw error;
      return data as (PriceCurrent & { competitor: { name: string; base_url: string } | null })[];
    },
    enabled: !!productId,
  });
};

// Hook pour récupérer l'historique des prix d'un produit (72h)
export const useProductPriceSnapshots = (productId: string, packSize?: number) => {
  return useQuery({
    queryKey: ['price-snapshots', productId, packSize],
    queryFn: async () => {
      const seventyTwoHoursAgo = new Date();
      seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);

      let query = supabase
        .from('price_snapshots')
        .select(`
          *,
          competitor:competitors(name, base_url)
        `)
        .eq('product_id', productId)
        .eq('is_suspect', false)
        .gte('scraped_at', seventyTwoHoursAgo.toISOString())
        .order('scraped_at', { ascending: false });

      if (packSize !== undefined) {
        query = query.eq('pack_size', packSize);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (PriceSnapshot & { competitor: { name: string; base_url: string } | null })[];
    },
    enabled: !!productId,
  });
};

// Hook pour les derniers runs de scraping
export const useScrapeRuns = (limit = 10) => {
  return useQuery({
    queryKey: ['scrape-runs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scrape_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ScrapeRun[];
    },
  });
};

// Hook pour les concurrents
export const useCompetitors = () => {
  return useQuery({
    queryKey: ['competitors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as unknown as Competitor[];
    },
  });
};

// Hook pour les mappings produit-concurrent
export const useCompetitorProductMaps = (productId?: string) => {
  return useQuery({
    queryKey: ['competitor-product-maps', productId],
    queryFn: async () => {
      let query = supabase
        .from('competitor_product_map')
        .select(`
          *,
          competitor:competitors(*),
          product:products(id, name, ean)
        `)
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as CompetitorProductMap[];
    },
  });
};

// Mutation pour lancer le scraping
export const useTriggerScrape = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { force?: boolean; productIds?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('scrape-prices', {
        body: options || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.skipped) {
        toast.info(data.reason);
      } else {
        toast.success(`Scraping terminé: ${data.offers_saved} prix mis à jour`);
      }
      queryClient.invalidateQueries({ queryKey: ['price-current'] });
      queryClient.invalidateQueries({ queryKey: ['price-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['scrape-runs'] });
    },
    onError: (error) => {
      console.error('Erreur scraping:', error);
      toast.error('Erreur lors du scraping des prix');
    },
  });
};

// Mutation pour ajouter/modifier un mapping
export const useUpsertCompetitorMap = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapping: Partial<CompetitorProductMap> & { product_id: string; competitor_id: string }) => {
      if (mapping.id) {
        const { data, error } = await supabase
          .from('competitor_product_map')
          .update({
            product_url: mapping.product_url,
            pack_size: mapping.pack_size,
            active: mapping.active,
          })
          .eq('id', mapping.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('competitor_product_map')
          .insert({
            product_id: mapping.product_id,
            competitor_id: mapping.competitor_id,
            product_url: mapping.product_url || '',
            pack_size: mapping.pack_size || 1,
            active: mapping.active ?? true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success('Mapping sauvegardé');
      queryClient.invalidateQueries({ queryKey: ['competitor-product-maps'] });
    },
    onError: (error) => {
      console.error('Erreur sauvegarde mapping:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });
};

// Mutation pour supprimer un mapping
export const useDeleteCompetitorMap = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competitor_product_map')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mapping supprimé');
      queryClient.invalidateQueries({ queryKey: ['competitor-product-maps'] });
    },
    onError: (error) => {
      console.error('Erreur suppression mapping:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};

// Mutation pour créer un concurrent
export const useCreateCompetitor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      base_url: string;
      price_selector?: string | null;
      rate_limit_ms?: number | null;
      delivery_cost?: number | null;
    }) => {
      const { data: result, error } = await supabase
        .from('competitors')
        .insert({ ...data, enabled: true })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Concurrent ajouté');
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du concurrent");
    },
  });
};

// Mutation pour activer/désactiver un concurrent
export const useToggleCompetitor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('competitors')
        .update({ enabled })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Concurrent mis à jour');
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
    },
    onError: (error) => {
      console.error('Erreur mise à jour concurrent:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};
