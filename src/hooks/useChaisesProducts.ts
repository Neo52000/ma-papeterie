import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MobilierProduct {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  price: number;
  price_ht: number | null;
  price_ttc: number | null;
  image_url: string | null;
  badge: string | null;
  eco: boolean | null;
  stock_quantity: number | null;
  is_active: boolean | null;
}

const PAGE_SIZE = 40;

interface UseMobilierProductsOptions {
  page?: number;
  search?: string;
  subcategoryFilter?: string;
  priceRange?: { min: number; max: number } | null;
  sortBy?: "name" | "price_asc" | "price_desc" | "newest";
}

export function useChaisesProducts(options: UseMobilierProductsOptions = {}) {
  const { page = 1, search, subcategoryFilter, priceRange, sortBy = "name" } = options;

  return useQuery({
    queryKey: ["chaises-products", page, search, subcategoryFilter, priceRange, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, slug, name, description, category, subcategory, brand, price, price_ht, price_ttc, image_url, badge, eco, stock_quantity, is_active", { count: "exact" })
        .eq("is_active", true)
        .eq("category", "MOBILIER")
        .in("subcategory", ["SIEGES", "ERGONOMIE"]);

      if (search) {
        query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,ean.ilike.%${search}%`);
      }

      if (subcategoryFilter && subcategoryFilter !== "all") {
        query = query.eq("subcategory", subcategoryFilter);
      }

      if (priceRange) {
        query = query.gte("price", priceRange.min).lte("price", priceRange.max);
      }

      switch (sortBy) {
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        default:
          query = query.order("name", { ascending: true });
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        products: (data ?? []) as MobilierProduct[],
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
        page,
      };
    },
    staleTime: 5 * 60_000,
  });
}
