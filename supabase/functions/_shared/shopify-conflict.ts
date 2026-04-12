/**
 * Shopify ↔ Supabase conflict detection utility.
 * Supabase is always source of truth. Shopify changes are captured but
 * never auto-applied to pricing fields (margin rule protection).
 */

export interface ConflictResult {
  status: "none" | "shopify_newer" | "supabase_newer" | "conflict";
  shopifyModifiedAt: string | null;
  supabaseModifiedAt: string | null;
  lastSyncAt: string | null;
  autoResolvable: boolean;
}

interface MappingTimestamps {
  shopify_updated_at: string | null;
  supabase_updated_at: string | null;
  last_synced_at: string | null;
}

/**
 * Detect conflict between a Shopify product and its Supabase counterpart.
 *
 * Rules:
 * - Only Shopify changed since last sync → shopify_newer (auto-resolvable for non-price fields)
 * - Only Supabase changed since last sync → supabase_newer (next push will overwrite Shopify)
 * - Both changed since last sync → conflict (requires admin review)
 * - Neither changed → none
 */
export function detectConflict(
  mapping: MappingTimestamps,
  shopifyUpdatedAt: string,
  supabaseUpdatedAt: string,
): ConflictResult {
  const lastSync = mapping.last_synced_at
    ? new Date(mapping.last_synced_at).getTime()
    : 0;

  const shopifyTime = new Date(shopifyUpdatedAt).getTime();
  const supabaseTime = new Date(supabaseUpdatedAt).getTime();

  const prevShopifyTime = mapping.shopify_updated_at
    ? new Date(mapping.shopify_updated_at).getTime()
    : 0;
  const prevSupabaseTime = mapping.supabase_updated_at
    ? new Date(mapping.supabase_updated_at).getTime()
    : 0;

  const shopifyChanged = shopifyTime > prevShopifyTime && shopifyTime > lastSync;
  const supabaseChanged = supabaseTime > prevSupabaseTime && supabaseTime > lastSync;

  if (shopifyChanged && supabaseChanged) {
    return {
      status: "conflict",
      shopifyModifiedAt: shopifyUpdatedAt,
      supabaseModifiedAt: supabaseUpdatedAt,
      lastSyncAt: mapping.last_synced_at,
      autoResolvable: false,
    };
  }

  if (shopifyChanged) {
    return {
      status: "shopify_newer",
      shopifyModifiedAt: shopifyUpdatedAt,
      supabaseModifiedAt: supabaseUpdatedAt,
      lastSyncAt: mapping.last_synced_at,
      autoResolvable: true,
    };
  }

  if (supabaseChanged) {
    return {
      status: "supabase_newer",
      shopifyModifiedAt: shopifyUpdatedAt,
      supabaseModifiedAt: supabaseUpdatedAt,
      lastSyncAt: mapping.last_synced_at,
      autoResolvable: true,
    };
  }

  return {
    status: "none",
    shopifyModifiedAt: shopifyUpdatedAt,
    supabaseModifiedAt: supabaseUpdatedAt,
    lastSyncAt: mapping.last_synced_at,
    autoResolvable: true,
  };
}
