import type { Database as BaseDatabase, Json } from "./types";

// Tables absentes des types auto-générés (types.ts) et surcharges de colonnes
// ajoutées par des migrations récentes. À supprimer après régénération via
// `supabase gen types typescript`. Schémas dérivés des migrations SQL :
//   - supabase/migrations/20260320200001_shopify_product_mapping.sql
//   - supabase/migrations/20260412_001_shopify_bidirectional_sync.sql
//   - supabase/migrations/20260421120000_b2b_accounts_sirene_enrichment.sql
//   - supabase/migrations/20260428100000_prospection_schema.sql
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

// ── Prospection (migration 20260428100000) ──────────────────────────────────

export type ProspectStatus =
  | "new"
  | "qualified"
  | "contacted"
  | "engaged"
  | "converted"
  | "rejected"
  | "unreachable";

export type ProspectSegmentDB = "educational" | "public" | "liberal" | "pme";

type ProspectAddress = {
  street: string;
  zip: string;
  city: string;
  dept: string | null;
  code_commune: string | null;
};

type ProspectsRow = {
  id: string;
  siren: string;
  siret: string | null;
  name: string;
  legal_form: string | null;
  naf_code: string | null;
  naf_label: string | null;
  employee_range: string | null;
  founded_date: string | null;
  address: ProspectAddress | null;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  status: ProspectStatus;
  score: number | null;
  client_segment: ProspectSegmentDB | null;
  assigned_to: string | null;
  tags: string[];
  notes: string | null;
  source: string;
  sirene_raw: Json | null;
  sirene_synced_at: string | null;
  converted_profile_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProspectsInsert = {
  id?: string;
  siren: string;
  siret?: string | null;
  name: string;
  legal_form?: string | null;
  naf_code?: string | null;
  naf_label?: string | null;
  employee_range?: string | null;
  founded_date?: string | null;
  address?: ProspectAddress | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  website?: string | null;
  status?: ProspectStatus;
  score?: number | null;
  client_segment?: ProspectSegmentDB | null;
  assigned_to?: string | null;
  tags?: string[];
  notes?: string | null;
  source?: string;
  sirene_raw?: Json | null;
  sirene_synced_at?: string | null;
  converted_profile_id?: string | null;
  converted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProspectsUpdate = Partial<ProspectsInsert>;

type ProspectInteractionsRow = {
  id: string;
  prospect_id: string;
  channel: string;
  direction: "inbound" | "outbound";
  subject: string | null;
  description: string | null;
  metadata: Json;
  created_by: string | null;
  created_at: string;
};

type ProspectInteractionsInsert = {
  id?: string;
  prospect_id: string;
  channel: string;
  direction?: "inbound" | "outbound";
  subject?: string | null;
  description?: string | null;
  metadata?: Json;
  created_by?: string | null;
  created_at?: string;
};

type ProspectInteractionsUpdate = Partial<ProspectInteractionsInsert>;

type ProspectCampaignsRow = {
  id: string;
  name: string;
  description: string | null;
  target_segment: ProspectSegmentDB | null;
  target_filters: Json;
  brevo_list_id: number | null;
  brevo_workflow_id: number | null;
  status: "draft" | "active" | "paused" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ProspectCampaignsInsert = {
  id?: string;
  name: string;
  description?: string | null;
  target_segment?: ProspectSegmentDB | null;
  target_filters?: Json;
  brevo_list_id?: number | null;
  brevo_workflow_id?: number | null;
  status?: "draft" | "active" | "paused" | "archived";
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProspectCampaignsUpdate = Partial<ProspectCampaignsInsert>;

type ProspectEnrollmentsRow = {
  prospect_id: string;
  campaign_id: string;
  enrolled_at: string;
  unsubscribed_at: string | null;
  bounced_at: string | null;
  last_event: string | null;
  last_event_at: string | null;
};

type ProspectEnrollmentsInsert = {
  prospect_id: string;
  campaign_id: string;
  enrolled_at?: string;
  unsubscribed_at?: string | null;
  bounced_at?: string | null;
  last_event?: string | null;
  last_event_at?: string | null;
};

type ProspectEnrollmentsUpdate = Partial<ProspectEnrollmentsInsert>;

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
  prospects: {
    Row: ProspectsRow;
    Insert: ProspectsInsert;
    Update: ProspectsUpdate;
    Relationships: [
      {
        foreignKeyName: "prospects_assigned_to_fkey";
        columns: ["assigned_to"];
        isOneToOne: false;
        referencedRelation: "users";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "prospects_converted_profile_id_fkey";
        columns: ["converted_profile_id"];
        isOneToOne: false;
        referencedRelation: "profiles";
        referencedColumns: ["id"];
      },
    ];
  };
  prospect_interactions: {
    Row: ProspectInteractionsRow;
    Insert: ProspectInteractionsInsert;
    Update: ProspectInteractionsUpdate;
    Relationships: [
      {
        foreignKeyName: "prospect_interactions_prospect_id_fkey";
        columns: ["prospect_id"];
        isOneToOne: false;
        referencedRelation: "prospects";
        referencedColumns: ["id"];
      },
    ];
  };
  prospect_campaigns: {
    Row: ProspectCampaignsRow;
    Insert: ProspectCampaignsInsert;
    Update: ProspectCampaignsUpdate;
    Relationships: [];
  };
  prospect_enrollments: {
    Row: ProspectEnrollmentsRow;
    Insert: ProspectEnrollmentsInsert;
    Update: ProspectEnrollmentsUpdate;
    Relationships: [
      {
        foreignKeyName: "prospect_enrollments_prospect_id_fkey";
        columns: ["prospect_id"];
        isOneToOne: false;
        referencedRelation: "prospects";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "prospect_enrollments_campaign_id_fkey";
        columns: ["campaign_id"];
        isOneToOne: false;
        referencedRelation: "prospect_campaigns";
        referencedColumns: ["id"];
      },
    ];
  };
};

export type Database = Omit<BaseDatabase, "public"> & {
  public: Omit<BaseDatabase["public"], "Tables"> & {
    Tables: BaseDatabase["public"]["Tables"] & ExtraTables;
  };
};
