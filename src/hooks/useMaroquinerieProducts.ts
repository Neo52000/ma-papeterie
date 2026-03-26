import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MaroquinerieProduct {
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

interface UseMaroquinerieProductsOptions {
  page?: number;
  search?: string;
  categoryFilter?: string;
  priceRange?: { min: number; max: number } | null;
  sortBy?: "name" | "price_asc" | "price_desc" | "newest";
}

export function useMaroquinerieProducts(options: UseMaroquinerieProductsOptions = {}) {
  const { page = 1, search, categoryFilter, priceRange, sortBy = "name" } = options;

  return useQuery({
    queryKey: ["maroquinerie-products", page, search, categoryFilter, priceRange, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, slug, name, description, category, subcategory, brand, price, price_ht, price_ttc, image_url, badge, eco, stock_quantity, is_active", { count: "exact" })
        .eq("is_active", true)
        .in("category", ["BAGAGERIE ET MAROQUINERIE", "BAGAGERIE"]);
const CATEGORY_FILTER =
  "category.eq.BAGAGERIE ET MAROQUINERIE," +
  "category.eq.BAGAGERIE," +
  "category.eq.BAGAGERIE INFORMATIQUE";

export const TYPE_FILTERS = [
  { label: "Tous", value: "all" },
  { label: "Sacs à dos", value: "sacs-a-dos" },
  { label: "Trousses & Fourre-tout", value: "trousses" },
  { label: "Sacoches", value: "sacoches" },
  { label: "Housses", value: "housses" },
  { label: "Valises & Trolleys", value: "valises" },
  { label: "Porte-documents", value: "porte-documents" },
  { label: "Bagagerie Pro", value: "bagagerie-pro" },
  { label: "Bagagerie Info", value: "bagagerie-info" },
] as const;

export type TypeFilterValue = (typeof TYPE_FILTERS)[number]["value"];

interface UseMaroquinerieProductsOptions {
  page?: number;
  search?: string;
  typeFilter?: TypeFilterValue;
  priceRange?: { min: number; max: number } | null;
  brand?: string;
  sortBy?: "name" | "price_asc" | "price_desc" | "newest";
}

function applyTypeFilter(query: any, typeFilter: TypeFilterValue) {
  switch (typeFilter) {
    case "sacs-a-dos":
      return query.or("name.ilike.%sac à dos%,name.ilike.%sac a dos%");
    case "trousses":
      return query.or("name.ilike.%trousse%,name.ilike.%fourre-tout%,name.ilike.%étui%,name.ilike.%etui%");
    case "sacoches":
      return query.ilike("name", "%sacoche%");
    case "housses":
      return query.or("name.ilike.%housse%,name.ilike.%protection%");
    case "valises":
      return query.or("name.ilike.%valise%,name.ilike.%trolley%");
    case "porte-documents":
      return query.or("name.ilike.%porte-document%,name.ilike.%conferen%,name.ilike.%serviette%");
    case "bagagerie-pro":
      return query.eq("category", "BAGAGERIE");
    case "bagagerie-info":
      return query.eq("category", "BAGAGERIE INFORMATIQUE");
    default:
      return query;
  }
}

export function useMaroquinerieProducts(options: UseMaroquinerieProductsOptions = {}) {
  const { page = 1, search, typeFilter = "all", priceRange, brand, sortBy = "name" } = options;

  return useQuery({
    queryKey: ["maroquinerie-products", page, search, typeFilter, priceRange, brand, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(
          "id, slug, name, description, category, subcategory, brand, price, price_ht, price_ttc, image_url, badge, eco, stock_quantity, is_active",
          { count: "exact" }
        )
        .eq("is_active", true)
        .or(CATEGORY_FILTER);

      if (search) {
        query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,ean.ilike.%${search}%`);
      }

      if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      if (typeFilter !== "all") {
        query = applyTypeFilter(query, typeFilter);
      }

      if (priceRange) {
        query = query.gte("price", priceRange.min).lte("price", priceRange.max);
      }

      if (brand) {
        query = query.eq("brand", brand);
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
        products: (data ?? []) as MaroquinerieProduct[],
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
        page,
      };
    },
    staleTime: 5 * 60_000,
  });
}

export function useMaroquinerieBrands() {
  return useQuery({
    queryKey: ["maroquinerie-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("brand")
        .eq("is_active", true)
        .or(CATEGORY_FILTER)
        .not("brand", "is", null);

      if (error) throw error;

      const brandCounts = new Map<string, number>();
      for (const row of data ?? []) {
        if (row.brand) {
          brandCounts.set(row.brand, (brandCounts.get(row.brand) ?? 0) + 1);
        }
      }

      return Array.from(brandCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    },
    staleTime: 10 * 60_000,
  });
}

export function useMaroquinerieCount() {
  return useQuery({
    queryKey: ["maroquinerie-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .or(CATEGORY_FILTER);

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 10 * 60_000,
  });
}
