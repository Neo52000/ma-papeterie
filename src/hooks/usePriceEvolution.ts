import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PriceHistoryPoint {
  date: string;
  price: number;
  margin?: number;
}

export interface CompetitorPriceHistory {
  date: string;
  [key: string]: string | number;
}

export const usePriceEvolution = (productId?: string) => {
  return useQuery({
    queryKey: ['price-evolution', productId],
    queryFn: async () => {
      // Récupérer l'historique des ajustements de prix
      let adjustmentsQuery = supabase
        .from('price_adjustments')
        .select('created_at, new_price_ht, new_margin_percent, old_price_ht, old_margin_percent, product_id')
        .eq('status', 'applied')
        .order('created_at', { ascending: true });

      if (productId) {
        adjustmentsQuery = adjustmentsQuery.eq('product_id', productId);
      }

      const { data: adjustments, error: adjError } = await adjustmentsQuery;
      if (adjError) throw adjError;

      // Transformer en points d'historique
      const priceHistory: PriceHistoryPoint[] = adjustments?.map(adj => ({
        date: new Date(adj.created_at).toLocaleDateString('fr-FR'),
        price: adj.new_price_ht,
        margin: adj.new_margin_percent || undefined,
      })) || [];

      return priceHistory;
    },
    enabled: true,
  });
};

export const useCompetitorPriceEvolution = (productId: string) => {
  return useQuery({
    queryKey: ['competitor-price-evolution', productId],
    queryFn: async () => {
      const { data: prices, error } = await supabase
        .from('competitor_prices')
        .select('scraped_at, competitor_name, competitor_price')
        .eq('product_id', productId)
        .order('scraped_at', { ascending: true });

      if (error) throw error;

      // Grouper par date et concurrent
      const groupedByDate = new Map<string, Map<string, number>>();
      
      prices?.forEach(price => {
        const date = new Date(price.scraped_at).toLocaleDateString('fr-FR');
        if (!groupedByDate.has(date)) {
          groupedByDate.set(date, new Map());
        }
        groupedByDate.get(date)!.set(price.competitor_name, price.competitor_price);
      });

      // Transformer en format pour recharts
      const evolution: CompetitorPriceHistory[] = Array.from(groupedByDate.entries()).map(([date, competitors]) => {
        const point: CompetitorPriceHistory = { date };
        competitors.forEach((price, name) => {
          point[name] = price;
        });
        return point;
      });

      return evolution;
    },
    enabled: !!productId,
  });
};

export const useMarginEvolution = (productId?: string) => {
  return useQuery({
    queryKey: ['margin-evolution', productId],
    queryFn: async () => {
      let query = supabase
        .from('price_adjustments')
        .select('created_at, new_margin_percent, product_id, products(name)')
        .eq('status', 'applied')
        .order('created_at', { ascending: true });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const marginHistory = data?.map(adj => ({
        date: new Date(adj.created_at).toLocaleDateString('fr-FR'),
        margin: adj.new_margin_percent || 0,
        productName: (adj.products as any)?.name || 'Inconnu',
      })) || [];

      return marginHistory;
    },
    enabled: true,
  });
};

export const usePriceEvolutionStats = () => {
  return useQuery({
    queryKey: ['price-evolution-stats'],
    queryFn: async () => {
      // Récupérer tous les ajustements appliqués
      const { data: adjustments, error } = await supabase
        .from('price_adjustments')
        .select('price_change_percent, new_margin_percent, old_margin_percent')
        .eq('status', 'applied');

      if (error) throw error;

      const totalAdjustments = adjustments?.length || 0;
      
      const avgPriceChange = totalAdjustments > 0
        ? adjustments.reduce((sum, adj) => sum + adj.price_change_percent, 0) / totalAdjustments
        : 0;

      const avgMarginImprovement = totalAdjustments > 0
        ? adjustments.reduce((sum, adj) => {
            const improvement = (adj.new_margin_percent || 0) - (adj.old_margin_percent || 0);
            return sum + improvement;
          }, 0) / totalAdjustments
        : 0;

      const priceIncreases = adjustments?.filter(adj => adj.price_change_percent > 0).length || 0;
      const priceDecreases = adjustments?.filter(adj => adj.price_change_percent < 0).length || 0;

      return {
        totalAdjustments,
        avgPriceChange: avgPriceChange.toFixed(2),
        avgMarginImprovement: avgMarginImprovement.toFixed(2),
        priceIncreases,
        priceDecreases,
      };
    },
  });
};
