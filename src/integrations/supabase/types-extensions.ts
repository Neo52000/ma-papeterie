import type { Database as BaseDatabase, Json } from "./types";

// Tables absentes des types auto-générés (types.ts) et surcharges de colonnes
// ajoutées par des migrations récentes. À supprimer après régénération via
// `supabase gen types typescript`. Schémas dérivés des migrations SQL :
//   - supabase/migrations/20260320200001_shopify_product_mapping.sql
//   - supabase/migrations/20260412_001_shopify_bidirectional_sync.sql
//   - supabase/migrations/20260421120000_b2b_accounts_sirene_enrichment.sql
// et des Edge Functions shopify-webhook + pull-shopify-orders + recherche-entreprises-search.

type ShopifyProductMappingRow = {
  id: string;
  product_id: string;
  shopify_product_id: string;
  shopify_variant_id: string | null;
  shopify_inventory_item_id: string | null;
  last_synced_at: string;
  created_at: string;
  stale: boolean;
  shopify_updated_at: string | null;
  supabase_updated_at: string | null;
  sync_direction: "push" | "pull" | "both";
  conflict_status: "none" | "shopify_newer" | "supabase_newer" | "conflict" | null;
  shopify_product_data: Json | null;
  last_pull_at: string | null;
  last_push_at: string | null;
};

type ShopifyProductMappingInsert = {
  id?: string;
  product_id: string;
  shopify_product_id: string;
  shopify_variant_id?: string | null;
  shopify_inventory_item_id?: string | null;
  last_synced_at?: string;
  created_at?: string;
  stale?: boolean;
  shopify_updated_at?: string | null;
  supabase_updated_at?: string | null;
  sync_direction?: "push" | "pull" | "both";
  conflict_status?: "none" | "shopify_newer" | "supabase_newer" | "conflict" | null;
  shopify_product_data?: Json | null;
  last_pull_at?: string | null;
  last_push_at?: string | null;
};

type ShopifyProductMappingUpdate = Partial<ShopifyProductMappingInsert>;

type ShopifyOrdersRow = {
  id: string;
  shopify_order_id: string;
  order_number: string | null;
  source_name: string | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  total_price: number | null;
  subtotal_price: number | null;
  total_tax: number | null;
  currency: string | null;
  customer_email: string | null;
  customer_name: string | null;
  line_items: Json | null;
  pos_location_id: string | null;
  shopify_created_at: string | null;
  synced_at: string | null;
  created_at: string | null;
};

type ShopifyOrdersInsert = {
  id?: string;
  shopify_order_id: string;
  order_number?: string | null;
  source_name?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  total_price?: number | null;
  subtotal_price?: number | null;
  total_tax?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  line_items?: Json | null;
  pos_location_id?: string | null;
  shopify_created_at?: string | null;
  synced_at?: string | null;
  created_at?: string | null;
};

type ShopifyOrdersUpdate = Partial<ShopifyOrdersInsert>;

// ── sirene_cache : cache des réponses data.gouv (TTL 24h) ───────────────────
// NB : les colonnes SIRENE ajoutées à `b2b_accounts` par la migration
// 20260421120000 ne sont pas re-déclarées ici — un override du type
// `b2b_accounts` casserait l'inférence des autres tables (TS 5.8 a des
// difficultés avec des unions dérivées trop profondes). Les fichiers qui
// insèrent ces colonnes castent la payload (`as never`) en attendant
// `supabase gen types typescript`.

type SireneCacheRow = {
  query_key: string;
  response: Json;
  expires_at: string;
  created_at: string;
};

type SireneCacheInsert = {
  query_key: string;
  response: Json;
  expires_at: string;
  created_at?: string;
};

type SireneCacheUpdate = Partial<SireneCacheInsert>;

type ExtraTables = {
  shopify_product_mapping: {
    Row: ShopifyProductMappingRow;
    Insert: ShopifyProductMappingInsert;
    Update: ShopifyProductMappingUpdate;
    Relationships: [
      {
        foreignKeyName: "shopify_product_mapping_product_id_fkey";
        columns: ["product_id"];
        isOneToOne: true;
        referencedRelation: "products";
        referencedColumns: ["id"];
      },
    ];
  };
  shopify_orders: {
    Row: ShopifyOrdersRow;
    Insert: ShopifyOrdersInsert;
    Update: ShopifyOrdersUpdate;
    Relationships: [];
  };
  sirene_cache: {
    Row: SireneCacheRow;
    Insert: SireneCacheInsert;
    Update: SireneCacheUpdate;
    Relationships: [];
  };
};

export type Database = Omit<BaseDatabase, "public"> & {
  public: Omit<BaseDatabase["public"], "Tables"> & {
    Tables: BaseDatabase["public"]["Tables"] & ExtraTables;
  };
};
