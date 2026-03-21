export type ShopifyHealthStatus = 'connected' | 'error' | 'unreachable' | 'unknown'

export type SyncOperation =
  | 'product_push'
  | 'product_pull'
  | 'webhook_received'
  | 'reconciliation'
  | 'manual_sync'
  | 'health_check'
  | 'price_update'
  | 'inventory_update'

export type SyncDirection = 'supabase_to_shopify' | 'shopify_to_supabase' | 'internal'
export type SyncStatus = 'success' | 'error' | 'skipped' | 'conflict' | 'pending'
export type SyncTrigger = 'system' | 'webhook' | 'manual' | 'cron'

export interface ShopifyConfig {
  shop_domain: string
  api_version: string
  pos_active: boolean
  pos_location_id: string | null
  access_token_set: boolean
  webhook_secret_set: boolean
  last_health_check: string | null
  health_status: ShopifyHealthStatus
  product_count: number
  updated_at: string
}

export interface SyncLogEntry {
  id: string
  operation: SyncOperation
  direction: SyncDirection | null
  status: SyncStatus
  items_affected: number
  error_message: string | null
  triggered_by: SyncTrigger
  created_at: string
}

export interface SyncStats {
  last24h: {
    total: number
    success: number
    error: number
  }
}

export interface ShopifyStatusResponse {
  config: ShopifyConfig
  recentLogs: SyncLogEntry[]
  stats: SyncStats
}
