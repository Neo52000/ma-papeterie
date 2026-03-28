import { useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type CategoryLevel = "famille" | "sous_famille" | "categorie" | "sous_categorie";

export interface Category {
  id: string;
  name: string;
  slug: string;
  level: CategoryLevel;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: Category[];
  product_count?: number;
}

export interface SupplierCategoryMapping {
  id: string;
  category_id: string;
  supplier_id: string;
  supplier_category_name: string;
  supplier_subcategory_name: string | null;
  is_verified: boolean;
  created_at: string;
  supplier_name?: string;
  category_name?: string;
}

async function fetchCategoriesFromDb(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as Category[]) || [];
}

function buildTree(cats: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  cats.forEach(c => map.set(c.id, { ...c, children: [] }));
  cats.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function useCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading: loading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategoriesFromDb,
    staleTime: 10 * 60_000,  // 10min — catégories changent rarement
    gcTime: 30 * 60_000,
  });

  const tree = useMemo(() => buildTree(categories), [categories]);

  const fetchCategories = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  }, [queryClient]);

  const getCategoriesByLevel = useCallback((level: CategoryLevel) => {
    return categories.filter(c => c.level === level);
  }, [categories]);

  const getChildrenOf = useCallback((parentId: string | null) => {
    return categories.filter(c => c.parent_id === parentId);
  }, [categories]);

  const createCategory = async (data: {
    name: string;
    level: CategoryLevel;
    parent_id?: string | null;
    description?: string;
    image_url?: string;
    sort_order?: number;
  }) => {
    const slug = data.name
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const { error } = await (supabase
      .from("categories") as any)
      .insert([{ ...data, slug, parent_id: data.parent_id || null }]);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Succès", description: "Catégorie créée" });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    return true;
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    const updates: Partial<Category> & { slug?: string } = { ...data };
    if (data.name) {
      updates.slug = data.name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }
    const { error } = await supabase.from("categories").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Succès", description: "Catégorie mise à jour" });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    return true;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Succès", description: "Catégorie supprimée" });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    return true;
  };

  return {
    categories,
    tree,
    loading,
    fetchCategories,
    getCategoriesByLevel,
    getChildrenOf,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

export function useSupplierCategoryMappings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading: loading } = useQuery({
    queryKey: ['supplier-category-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_category_mappings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as SupplierCategoryMapping[]) || [];
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

  const fetchMappings = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['supplier-category-mappings'] });
  }, [queryClient]);

  const createMapping = async (data: {
    category_id: string;
    supplier_id: string;
    supplier_category_name: string;
    supplier_subcategory_name?: string;
    is_verified?: boolean;
  }) => {
    const { error } = await (supabase
      .from("supplier_category_mappings") as any)
      .insert([data]);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Succès", description: "Mapping créé" });
    queryClient.invalidateQueries({ queryKey: ['supplier-category-mappings'] });
    return true;
  };

  const updateMapping = async (id: string, data: Partial<SupplierCategoryMapping>) => {
    const { error } = await supabase
      .from("supplier_category_mappings")
      .update(data as Record<string, unknown>)
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Succès", description: "Mapping mis à jour" });
    queryClient.invalidateQueries({ queryKey: ['supplier-category-mappings'] });
    return true;
  };

  const deleteMapping = async (id: string) => {
    const { error } = await supabase.from("supplier_category_mappings").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Succès", description: "Mapping supprimé" });
    queryClient.invalidateQueries({ queryKey: ['supplier-category-mappings'] });
    return true;
  };

  return {
    mappings,
    loading,
    fetchMappings,
    createMapping,
    updateMapping,
    deleteMapping,
  };
}
