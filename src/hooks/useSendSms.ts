import { supabase } from "@/integrations/supabase/client";

interface SmsNotificationParams {
  sms_type: "order_status" | "shipping_alert" | "service_order" | "wishlist_alert" | "promotional" | "test";
  recipient_phone: string;
  user_id?: string;
  template_slug: string;
  variables?: Record<string, string>;
  message?: string;
  order_id?: string;
  service_order_id?: string;
  campaign_id?: string;
}

/**
 * Fire-and-forget: envoie une notification SMS via l'Edge Function send-sms.
 * Ne bloque jamais le flux appelant (commande, statut, etc.)
 *
 * Pattern identique à fireBrevoSync() dans useBrevoSync.ts
 */
export function fireSmsNotification(params: SmsNotificationParams) {
  supabase.functions
    .invoke("send-sms", { body: params })
    .catch((err) => {
      if (import.meta.env.DEV) console.error("SMS send error:", err);
    });
}
