import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompetitorPrice {
  id: string;
  product_id: string;
  competitor_name: string;
  competitor_price: number;
  competitor_url: string | null;
  price_difference: number | null;
  price_difference_percent: number | null;
  product_ean: string | null;
  scraped_at: string;
  created_at: string;
}

export const useCompetitorPrices = (productId?: string) => {
  return useQuery({
    queryKey: ['competitor-prices', productId],
    queryFn: async () => {
      let query = supabase
        .from('competitor_prices')
        .select('*')
        .order('scraped_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CompetitorPrice[];
    },
    enabled: !!productId || productId === undefined,
  });
};

export const useLatestCompetitorPrices = (productId: string) => {
  return useQuery({
    queryKey: ['latest-competitor-prices', productId],
    queryFn: async () => {
      // Récupérer les derniers prix pour chaque concurrent
      const { data, error } = await supabase
        .from('competitor_prices')
        .select('*')
        .eq('product_id', productId)
        .order('scraped_at', { ascending: false });

      if (error) throw error;

      // Garder uniquement le dernier prix par concurrent
      const latestByCompetitor = new Map<string, CompetitorPrice>();
      data?.forEach(price => {
        if (!latestByCompetitor.has(price.competitor_name)) {
          latestByCompetitor.set(price.competitor_name, price as CompetitorPrice);
        }
      });

      return Array.from(latestByCompetitor.values());
    },
    enabled: !!productId,
  });
};

export const useScrapePrices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('scrape-prices', {
        body: { productIds, force: true }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-prices'] });
      toast.success('Prix concurrents mis à jour');
    },
    onError: (error) => {
      console.error('Erreur scraping:', error);
      toast.error('Erreur lors de la mise à jour des prix');
    }
  });
};

export interface DiscoverResult {
  success: boolean;
  dry_run: boolean;
  stats: { found: number; skipped: number; not_found: number; errors: number };
  details: Array<{ product: string; competitor: string; url: string | null; status: string }>;
}

export const useDiscoverCompetitorUrls = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      productIds?: string[];
      competitorIds?: string[];
      batchSize?: number;
      dryRun?: boolean;
    } = {}): Promise<DiscoverResult> => {
      const { data, error } = await supabase.functions.invoke('discover-competitor-urls', {
        body: params,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Erreur inconnue');
      return data as DiscoverResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['competitor-prices'] });
      const { found, skipped, not_found, errors } = data.stats;
      toast.success(
        `Découverte terminée : ${found} URL(s) trouvée(s), ${skipped} déjà mappée(s), ${not_found} introuvable(s)${errors > 0 ? `, ${errors} erreur(s)` : ''}`
      );
    },
    onError: (error) => {
      console.error('Erreur découverte URLs:', error);
      toast.error('Erreur lors de la découverte des URLs concurrentes');
    },
  });
};

export const useCompetitorStats = () => {
  return useQuery({
    queryKey: ['competitor-stats'],
    queryFn: async () => {
      // Meilleur prix concurrent par produit (pack_size=1)
      const { data: bestPrices, error: bestError } = await supabase
        .from('price_current')
        .select('product_id, best_price')
        .eq('pack_size', 1)
        .not('best_price', 'is', null);

      if (bestError) throw bestError;

      if (!bestPrices || bestPrices.length === 0) {
        return { cheaperPercent: '0', avgDifference: '0', totalProducts: 0, cheaperCount: 0 };
      }

      // Prix public de nos produits
      const productIds = bestPrices.map(p => p.product_id);
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, price')
        .in('id', productIds);

      if (prodError) throw prodError;

      const ourPrices = new Map<string, number>();
      products?.forEach(p => ourPrices.set(p.id, Number(p.price)));

      // Calcul des écarts : positif = nous sommes plus chers, négatif = nous sommes moins chers
      const differences: number[] = [];
      bestPrices.forEach(bp => {
        const ourPrice = ourPrices.get(bp.product_id);
        if (!ourPrice || bp.best_price === null) return;
        const diffPct = ((ourPrice - Number(bp.best_price)) / Number(bp.best_price)) * 100;
        differences.push(diffPct);
      });

      const cheaperCount = differences.filter(d => d < 0).length;
      const totalProducts = differences.length;
      const cheaperPercent = totalProducts > 0 ? (cheaperCount / totalProducts) * 100 : 0;
      const avgDifference = totalProducts > 0
        ? differences.reduce((sum, d) => sum + d, 0) / totalProducts
        : 0;

      return {
        cheaperPercent: cheaperPercent.toFixed(0),
        avgDifference: avgDifference.toFixed(1),
        totalProducts,
        cheaperCount,
      };
    }
  });
};
