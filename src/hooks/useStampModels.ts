import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StampModel } from '@/components/stamp-designer/types';

export function useStampModels(filters?: { brand?: string; type?: string }) {
  return useQuery<StampModel[]>({
    queryKey: ['stamp-models', filters?.brand, filters?.type],
    queryFn: async () => {
      let query = supabase
        .from('stamp_models')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (filters?.brand) {
        query = query.eq('brand', filters.brand);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        brand: row.brand,
        type: row.type as StampModel['type'],
        slug: row.slug,
        width_mm: Number(row.width_mm),
        height_mm: Number(row.height_mm),
        max_lines: row.max_lines,
        supports_logo: row.supports_logo,
        base_price_ht: Number(row.base_price_ht),
        base_price_ttc: Number(row.base_price_ttc),
        tva_rate: Number(row.tva_rate),
        image_url: row.image_url,
        available_ink_colors: row.available_ink_colors as string[],
        available_case_colors: row.available_case_colors as string[],
        is_active: row.is_active,
        stock_quantity: row.stock_quantity,
        display_order: row.display_order,
        description: row.description,
      }));
    },
  });
}

export function useStampModelBySlug(slug: string | undefined) {
  return useQuery<StampModel | null>({
    queryKey: ['stamp-model', slug],
    enabled: !!slug,
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('stamp_models')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        brand: data.brand,
        type: data.type as StampModel['type'],
        slug: data.slug,
        width_mm: Number(data.width_mm),
        height_mm: Number(data.height_mm),
        max_lines: data.max_lines,
        supports_logo: data.supports_logo,
        base_price_ht: Number(data.base_price_ht),
        base_price_ttc: Number(data.base_price_ttc),
        tva_rate: Number(data.tva_rate),
        image_url: data.image_url,
        available_ink_colors: data.available_ink_colors as string[],
        available_case_colors: data.available_case_colors as string[],
        is_active: data.is_active,
        stock_quantity: data.stock_quantity,
        display_order: data.display_order,
        description: data.description,
      };
    },
  });
}
