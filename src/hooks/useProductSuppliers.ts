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

      let allResults = (directData || []).map((sp: any) => ({
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

      // Step 3: get supplier_offers for this product (ALKOR, COMLANDI, SOFT imports)
      const { data: offersData } = await supabase
        .from("supplier_offers")
        .select("id, supplier, supplier_product_id, purchase_price_ht, stock_qty, delivery_delay_days, min_qty, is_active")
        .eq("product_id", productId!)
        .eq("is_active", true);

      if (offersData) {
        // Deduplicate: only add offers whose supplier isn't already represented
        const existingSupplierNames = new Set(
          allResults.map((r: any) => (r.supplier_name || "").toUpperCase()),
        );
        for (const offer of offersData as any[]) {
          const name = (offer.supplier || "").toUpperCase();
          if (!existingSupplierNames.has(name)) {
            existingSupplierNames.add(name);
            allResults.push({
              id: `offer-${offer.id}`,
              supplier_id: offer.supplier,
              supplier_name: offer.supplier,
              supplier_reference: offer.supplier_product_id,
              supplier_price: offer.purchase_price_ht,
              stock_quantity: offer.stock_qty,
              lead_time_days: offer.delivery_delay_days,
              is_preferred: false,
              priority_rank: null,
              min_order_quantity: offer.min_qty,
              source_type: offer.supplier?.toLowerCase(),
            });
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
