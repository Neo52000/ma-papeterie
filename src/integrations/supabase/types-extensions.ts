import type { Database as BaseDatabase, Json } from "./types";

// Tables absentes des types auto-générés (types.ts). À supprimer après régénération via
// `supabase gen types typescript`. Schéma dérivé des migrations SQL :
//   - supabase/migrations/20260320200001_shopify_product_mapping.sql
//   - supabase/migrations/20260412_001_shopify_bidirectional_sync.sql
// et des Edge Functions shopify-webhook + pull-shopify-orders.

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
};

export type Database = Omit<BaseDatabase, "public"> & {
  public: Omit<BaseDatabase["public"], "Tables"> & {
    Tables: BaseDatabase["public"]["Tables"] & ExtraTables;
  };
};
