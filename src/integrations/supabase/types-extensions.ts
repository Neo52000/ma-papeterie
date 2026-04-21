import type { Database as BaseDatabase, Json } from "./types";

// Tables absentes des types auto-générés (types.ts). À supprimer après régénération via
// `supabase gen types typescript`. Schéma dérivé des migrations SQL :
//   - supabase/migrations/20260320200001_shopify_product_mapping.sql
//   - supabase/migrations/20260412_001_shopify_bidirectional_sync.sql
//   - supabase/migrations/20260418_005_pilotage_schema.sql (module Pilotage)
// et des Edge Functions shopify-webhook + pull-shopify-orders + pilotage-*.

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

// =============================================================================
// Module Pilotage — tables définies par 20260418_005_pilotage_schema.sql
// =============================================================================

type PilotageChannel = "web_b2c" | "web_b2b" | "pos" | "all";
type PilotagePeriod = "day" | "week" | "month" | "quarter" | "year";
type PilotageAlertSeverity = "info" | "warning" | "critical";
type PilotageAlertStatus = "active" | "acknowledged" | "resolved" | "dismissed";
type PilotageCoachRole = "system" | "user" | "assistant";

type PilotageSnapshotRow = {
  id: string;
  snapshot_date: string;
  channel: PilotageChannel;
  ca_ht: number;
  ca_ttc: number;
  cogs_ht: number;
  marge_brute: number;
  taux_marge: number;
  nb_orders: number;
  nb_orders_paid: number;
  panier_moyen_ht: number;
  nb_customers_unique: number;
  nb_customers_new: number;
  nb_customers_returning: number;
  encaissements_ttc: number;
  creances_pendantes_ttc: number;
  nb_transactions_pos: number | null;
  ticket_moyen_pos_ttc: number | null;
  nb_sessions: number | null;
  taux_conversion: number | null;
  computed_at: string;
  raw_data: Json | null;
};
type PilotageSnapshotInsert = {
  id?: string;
  snapshot_date: string;
  channel: PilotageChannel;
  ca_ht?: number;
  ca_ttc?: number;
  cogs_ht?: number;
  marge_brute?: number;
  taux_marge?: number;
  nb_orders?: number;
  nb_orders_paid?: number;
  panier_moyen_ht?: number;
  nb_customers_unique?: number;
  nb_customers_new?: number;
  nb_customers_returning?: number;
  encaissements_ttc?: number;
  creances_pendantes_ttc?: number;
  nb_transactions_pos?: number | null;
  ticket_moyen_pos_ttc?: number | null;
  nb_sessions?: number | null;
  taux_conversion?: number | null;
  computed_at?: string;
  raw_data?: Json | null;
};

type PilotageGoalRow = {
  id: string;
  period: PilotagePeriod;
  period_start: string;
  period_end: string;
  channel: PilotageChannel;
  objectif_ca_ht: number | null;
  objectif_marge_brute: number | null;
  objectif_taux_marge: number | null;
  objectif_nb_orders: number | null;
  objectif_panier_moyen_ht: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type PilotageGoalInsert = {
  id?: string;
  period: PilotagePeriod;
  period_start: string;
  period_end: string;
  channel?: PilotageChannel;
  objectif_ca_ht?: number | null;
  objectif_marge_brute?: number | null;
  objectif_taux_marge?: number | null;
  objectif_nb_orders?: number | null;
  objectif_panier_moyen_ht?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

type PilotageAlertRuleRow = {
  id: string;
  name: string;
  description: string | null;
  metric: string;
  operator: string;
  threshold: number;
  channel: PilotageChannel;
  severity: PilotageAlertSeverity;
  is_active: boolean;
  comparison_window_days: number;
  created_at: string;
  updated_at: string;
};
type PilotageAlertRuleInsert = {
  id?: string;
  name: string;
  description?: string | null;
  metric: string;
  operator: string;
  threshold: number;
  channel?: PilotageChannel;
  severity?: PilotageAlertSeverity;
  is_active?: boolean;
  comparison_window_days?: number;
  created_at?: string;
  updated_at?: string;
};

type PilotageAlertRow = {
  id: string;
  rule_id: string | null;
  severity: PilotageAlertSeverity;
  status: PilotageAlertStatus;
  title: string;
  message: string;
  metric: string | null;
  metric_value: number | null;
  threshold: number | null;
  channel: PilotageChannel | null;
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  context_data: Json | null;
};
type PilotageAlertInsert = {
  id?: string;
  rule_id?: string | null;
  severity: PilotageAlertSeverity;
  status?: PilotageAlertStatus;
  title: string;
  message: string;
  metric?: string | null;
  metric_value?: number | null;
  threshold?: number | null;
  channel?: PilotageChannel | null;
  triggered_at?: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  context_data?: Json | null;
};

type PilotageCoachConversationRow = {
  id: string;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  archived: boolean;
};
type PilotageCoachConversationInsert = {
  id?: string;
  title?: string;
  summary?: string | null;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string;
  archived?: boolean;
};

type PilotageCoachMessageRow = {
  id: string;
  conversation_id: string;
  role: PilotageCoachRole;
  content: string;
  kpi_snapshot: Json | null;
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  created_at: string;
};
type PilotageCoachMessageInsert = {
  id?: string;
  conversation_id: string;
  role: PilotageCoachRole;
  content: string;
  kpi_snapshot?: Json | null;
  model?: string | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
  created_at?: string;
};

// Vues matérialisées (lecture seule)
type MvPilotageOverviewCurrentRow = {
  channel: PilotageChannel;
  ca_ht_7d: number;
  marge_brute_7d: number;
  taux_marge_7d: number;
  nb_orders_7d: number;
  encaissements_7d: number;
  ca_ht_30d: number;
  marge_brute_30d: number;
  taux_marge_30d: number;
  nb_orders_30d: number;
  encaissements_30d: number;
  panier_moyen_30d: number;
  ca_ht_30d_prev: number;
  marge_brute_30d_prev: number;
  taux_marge_30d_prev: number;
  ca_delta_pct: number;
  marge_delta_pct: number;
  ca_ht_90d: number;
  marge_brute_90d: number;
  encaissements_90d: number;
  refreshed_at: string;
};

type MvPilotageTresorerieProjectionRow = {
  encaissement_prevu_date: string;
  channel: PilotageChannel;
  payment_status: string;
  montant_ttc: number;
  nb_orders: number;
};

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
  pilotage_snapshots: {
    Row: PilotageSnapshotRow;
    Insert: PilotageSnapshotInsert;
    Update: Partial<PilotageSnapshotInsert>;
    Relationships: [];
  };
  pilotage_goals: {
    Row: PilotageGoalRow;
    Insert: PilotageGoalInsert;
    Update: Partial<PilotageGoalInsert>;
    Relationships: [];
  };
  pilotage_alert_rules: {
    Row: PilotageAlertRuleRow;
    Insert: PilotageAlertRuleInsert;
    Update: Partial<PilotageAlertRuleInsert>;
    Relationships: [];
  };
  pilotage_alerts: {
    Row: PilotageAlertRow;
    Insert: PilotageAlertInsert;
    Update: Partial<PilotageAlertInsert>;
    Relationships: [
      {
        foreignKeyName: "pilotage_alerts_rule_id_fkey";
        columns: ["rule_id"];
        isOneToOne: false;
        referencedRelation: "pilotage_alert_rules";
        referencedColumns: ["id"];
      },
    ];
  };
  pilotage_coach_conversations: {
    Row: PilotageCoachConversationRow;
    Insert: PilotageCoachConversationInsert;
    Update: Partial<PilotageCoachConversationInsert>;
    Relationships: [];
  };
  pilotage_coach_messages: {
    Row: PilotageCoachMessageRow;
    Insert: PilotageCoachMessageInsert;
    Update: Partial<PilotageCoachMessageInsert>;
    Relationships: [
      {
        foreignKeyName: "pilotage_coach_messages_conversation_id_fkey";
        columns: ["conversation_id"];
        isOneToOne: false;
        referencedRelation: "pilotage_coach_conversations";
        referencedColumns: ["id"];
      },
    ];
  };
};

// Vues matérialisées — accessibles via `.from()` comme des tables
type ExtraViews = {
  mv_pilotage_overview_current: {
    Row: MvPilotageOverviewCurrentRow;
    Relationships: [];
  };
  mv_pilotage_tresorerie_projection: {
    Row: MvPilotageTresorerieProjectionRow;
    Relationships: [];
  };
};

export type Database = Omit<BaseDatabase, "public"> & {
  public: Omit<BaseDatabase["public"], "Tables" | "Views"> & {
    Tables: BaseDatabase["public"]["Tables"] & ExtraTables;
    Views: BaseDatabase["public"]["Views"] & ExtraViews;
  };
};
