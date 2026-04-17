/**
 * Sync types written by the shopify-webhook Edge Function.
 * Used to distinguish real webhook activity from manual pull operations
 * (pull-shopify-orders uses "pull_orders", etc.) when reporting webhook health.
 */
export const WEBHOOK_SYNC_TYPES = [
  "order_create",
  "order_update",
  "inventory_update",
  "product_create",
  "product_update",
  "product_delete",
] as const;

/**
 * Topics to register in Shopify Admin → Settings → Notifications → Webhooks.
 */
export const WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "products/create",
  "products/update",
  "products/delete",
  "inventory_levels/update",
];

export const formatDate = (date: string | null) => {
  if (!date) return "Jamais";
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export interface SyncLogEntry {
  id: string;
  product_id: string | null;
  shopify_product_id: string | null;
  sync_type: string;
  sync_direction: string;
  status: string;
  error_message: string | null;
  details: Record<string, unknown> | null;
  synced_at: string;
}
