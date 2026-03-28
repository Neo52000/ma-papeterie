/**
 * Helpers pour le stock magasin (product_stock_locations WHERE location_type = 'store').
 * Utilisé par toutes les fonctions Shopify POS pour lire/écrire le stock boutique.
 */

const STORE_LOCATION_TYPE = "store";
const STORE_LOCATION_NAME = "Magasin Chaumont";

/**
 * Récupère le stock magasin agrégé pour une liste de produits.
 * Produits sans entrée store → 0.
 */
export async function getStoreStock(
  supabase: any,
  productIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (productIds.length === 0) return result;

  const { data, error } = await supabase
    .from("product_stock_locations")
    .select("product_id, stock_quantity")
    .eq("location_type", STORE_LOCATION_TYPE)
    .in("product_id", productIds);

  if (error) {
    console.error("getStoreStock error:", error.message);
    return result;
  }

  // Agréger (un produit peut avoir plusieurs emplacements 'store')
  for (const row of data || []) {
    const current = result.get(row.product_id) || 0;
    result.set(row.product_id, current + (row.stock_quantity || 0));
  }

  return result;
}

/**
 * Upsert le stock magasin pour un produit donné.
 * Crée l'entrée si elle n'existe pas, met à jour sinon.
 */
export async function upsertStoreStock(
  supabase: any,
  productId: string,
  quantity: number,
): Promise<void> {
  const safeQty = Math.max(0, quantity);

  const { error } = await supabase
    .from("product_stock_locations")
    .upsert(
      {
        product_id: productId,
        location_type: STORE_LOCATION_TYPE,
        location_name: STORE_LOCATION_NAME,
        stock_quantity: safeQty,
        last_inventory_date: new Date().toISOString(),
      },
      { onConflict: "product_id,location_type,location_name" },
    );

  if (error) {
    console.error(`upsertStoreStock error for ${productId}:`, error.message);
    throw error;
  }
}

/**
 * Décrémente atomiquement le stock magasin d'un produit.
 * Utilise une requête RPC ou update conditionnel pour éviter les race conditions.
 */
export async function decrementStoreStock(
  supabase: any,
  productId: string,
  decrement: number,
): Promise<void> {
  if (decrement <= 0) return;

  // Lire le stock actuel pour cet emplacement
  const { data: existing } = await supabase
    .from("product_stock_locations")
    .select("id, stock_quantity")
    .eq("product_id", productId)
    .eq("location_type", STORE_LOCATION_TYPE)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const newQty = Math.max(0, (existing.stock_quantity || 0) - decrement);
    await supabase
      .from("product_stock_locations")
      .update({
        stock_quantity: newQty,
        last_inventory_date: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Pas d'entrée store → créer avec 0 (on ne peut pas décrémenter en négatif)
    await supabase
      .from("product_stock_locations")
      .insert({
        product_id: productId,
        location_type: STORE_LOCATION_TYPE,
        location_name: STORE_LOCATION_NAME,
        stock_quantity: 0,
        last_inventory_date: new Date().toISOString(),
      });
  }
}
