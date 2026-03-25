import { supabase } from '@/integrations/supabase/client';

const CHUNK_SIZE = 200;

/** Résout des références fournisseur en UUIDs supplier_products.id — utilisé par XLS et PDF import. */
export async function resolveSupplierProductIds(
  refs: string[],
  supplierId: string | null,
): Promise<Map<string, string>> {
  const refToId = new Map<string, string>();
  const uniqueRefs = [...new Set(refs.filter(Boolean))];
  if (uniqueRefs.length === 0 || !supplierId) return refToId;

  for (let i = 0; i < uniqueRefs.length; i += CHUNK_SIZE) {
    const chunk = uniqueRefs.slice(i, i + CHUNK_SIZE);
    const { data } = await supabase
      .from('supplier_products')
      .select('id, supplier_reference')
      .eq('supplier_id', supplierId)
      .in('supplier_reference', chunk);
    for (const sp of data || []) {
      if (sp.supplier_reference) refToId.set(sp.supplier_reference, sp.id);
    }
  }
  return refToId;
}
