-- ============================================================================
-- Migration: Enable missing Row Level Security
-- Date: 2026-04-01
-- Description:
--   1. Enable RLS on 15 tables that have policies defined but RLS not activated
--   2. Enable RLS + create admin-only policies on 8 tables missing both
-- ============================================================================

-- ── Part 1: Tables with existing policies but RLS not enabled ────────────────
-- These tables already have CREATE POLICY statements but the policies are not
-- enforced because ALTER TABLE ... ENABLE ROW LEVEL SECURITY was never run.

ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_globals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_editorial_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- ── Part 2: Tables without RLS AND without policies ─────────────────────────
-- These tables need both RLS enabled and policies created.
-- Default: admin-only access (service_role bypasses RLS automatically).

-- customer_rfm_scores — internal analytics, admin-only
ALTER TABLE public.customer_rfm_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_customer_rfm_scores"
  ON public.customer_rfm_scores FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- customer_interactions — CRM data, admin-only
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_customer_interactions"
  ON public.customer_interactions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- customer_recommendations — internal recommendations, admin-only
ALTER TABLE public.customer_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_customer_recommendations"
  ON public.customer_recommendations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- purchase_orders — supplier purchase orders, admin-only
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_purchase_orders"
  ON public.purchase_orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- product_stock_locations — warehouse stock locations, admin-only
ALTER TABLE public.product_stock_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_product_stock_locations"
  ON public.product_stock_locations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- product_volume_pricing — volume discount tiers, public read + admin write
ALTER TABLE public.product_volume_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_volume_pricing"
  ON public.product_volume_pricing FOR SELECT
  USING (true);
CREATE POLICY "admin_write_volume_pricing"
  ON public.product_volume_pricing FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- rate_limit_entries — internal rate limiting, service_role only (no user policies)
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;
-- No user-facing policies needed — only service_role (Edge Functions) accesses this table

-- finishing_pricing — printing service pricing, public read + admin write
ALTER TABLE public.finishing_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_finishing_pricing"
  ON public.finishing_pricing FOR SELECT
  USING (true);
CREATE POLICY "admin_write_finishing_pricing"
  ON public.finishing_pricing FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
