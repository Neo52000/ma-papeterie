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

export const useCompetitorStats = () => {
  return useQuery({
    queryKey: ['competitor-stats'],
    queryFn: async () => {
      const { data: prices, error } = await supabase
        .from('competitor_prices')
        .select('product_id, price_difference_percent')
        .order('scraped_at', { ascending: false });

      if (error) throw error;

      // Calculer les statistiques
      const latestByProduct = new Map<string, number>();
      prices?.forEach(price => {
        if (!latestByProduct.has(price.product_id) && price.price_difference_percent !== null) {
          latestByProduct.set(price.product_id, price.price_difference_percent);
        }
      });

      const differences = Array.from(latestByProduct.values());
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
        cheaperCount
      };
    }
  });
};
