import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_reference: string | null;
  supplier_price: number | null;
  stock_quantity: number | null;
  lead_time_days: number | null;
  is_preferred: boolean;
  priority_rank: number | null;
  min_order_quantity: number | null;
  source_type: string | null;
}

export function useProductSuppliers(productId: string | undefined, ean: string | null | undefined) {
  return useQuery({
    queryKey: ["product-suppliers", productId, ean],
    enabled: !!productId,
    queryFn: async (): Promise<SupplierProduct[]> => {
      // Step 1: get supplier_products linked directly to this product
      const directQuery = supabase
        .from("supplier_products")
        .select("id, supplier_id, supplier_reference, supplier_price, stock_quantity, lead_time_days, is_preferred, priority_rank, min_order_quantity, source_type, suppliers(name)")
        .eq("product_id", productId!);

      const { data: directData, error: directError } = await directQuery;
      if (directError) throw directError;

      const allResults = (directData || []).map((sp: any) => ({
        ...sp,
        supplier_name: sp.suppliers?.name || "Inconnu",
      }));

      // Step 2: if product has an EAN, find other products with same EAN and their suppliers
      if (ean) {
        const { data: sameEanProducts } = await supabase
          .from("products")
          .select("id")
          .eq("ean", ean)
          .neq("id", productId!);

        if (sameEanProducts && sameEanProducts.length > 0) {
          const otherIds = sameEanProducts.map((p) => p.id);
          const { data: eanData } = await supabase
            .from("supplier_products")
            .select("id, supplier_id, supplier_reference, supplier_price, stock_quantity, lead_time_days, is_preferred, priority_rank, min_order_quantity, source_type, suppliers(name)")
            .in("product_id", otherIds);

          if (eanData) {
            const existingIds = new Set(allResults.map((r: any) => r.id));
            for (const sp of eanData as any[]) {
              if (!existingIds.has(sp.id)) {
                allResults.push({ ...sp, supplier_name: sp.suppliers?.name || "Inconnu" });
              }
            }
          }
        }
      }

      // Sort: preferred first, then by priority_rank, then by price
      allResults.sort((a: any, b: any) => {
        if (a.is_preferred !== b.is_preferred) return a.is_preferred ? -1 : 1;
        if ((a.priority_rank ?? 999) !== (b.priority_rank ?? 999))
          return (a.priority_rank ?? 999) - (b.priority_rank ?? 999);
        return (a.supplier_price ?? Infinity) - (b.supplier_price ?? Infinity);
      });

      return allResults;
    },
  });
}
