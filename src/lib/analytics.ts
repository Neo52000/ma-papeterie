/**
 * Analytics event tracker for the "Parent pressé" funnel.
 * Uses a simple dataLayer pattern compatible with GTM / GA4.
 * Falls back to console.debug in development.
 */

export type AnalyticsEvent =
  | 'upload_started'
  | 'ocr_done'
  | 'cart_variant_selected'
  | 'checkout_started'
  | 'purchase'
  | 'copilot_step_changed'
  | 'school_list_cta_clicked';

interface EventPayload {
  event: AnalyticsEvent;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer?: EventPayload[];
  }
}

export function trackEvent(event: AnalyticsEvent, data?: Record<string, unknown>) {
  const payload: EventPayload = { event, ...data };

  // Push to GTM dataLayer if available
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }

  // Always log in dev
  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, data);
  }
}
