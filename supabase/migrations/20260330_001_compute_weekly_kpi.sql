-- Fonction SQL pour calculer et insérer un snapshot KPI hebdomadaire
-- à partir des vraies données (orders, products, school_list_uploads, shopify_sync_log)

CREATE OR REPLACE FUNCTION public.compute_weekly_kpi_snapshot(
  p_week_start DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_week_end DATE := p_week_start + INTERVAL '6 days';
  v_orders INTEGER := 0;
  v_revenue NUMERIC(10,2) := 0;
  v_aov NUMERIC(10,2) := 0;
  v_new_customers INTEGER := 0;
  v_returning_customers INTEGER := 0;
  v_school_uploads INTEGER := 0;
  v_school_conversion NUMERIC(5,4) := 0;
  v_sync_errors INTEGER := 0;
  v_avg_margin NUMERIC(5,4) := 0;
  v_school_with_orders INTEGER := 0;
BEGIN
  -- Commandes et CA de la semaine
  SELECT
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(total_amount), 0)
  INTO v_orders, v_revenue
  FROM orders
  WHERE created_at >= p_week_start
    AND created_at < (v_week_end + INTERVAL '1 day')
    AND status NOT IN ('cancelled', 'refunded');

  -- Panier moyen
  IF v_orders > 0 THEN
    v_aov := v_revenue / v_orders;
  END IF;

  -- Nouveaux clients (première commande cette semaine)
  SELECT COUNT(DISTINCT customer_email)
  INTO v_new_customers
  FROM orders o
  WHERE o.created_at >= p_week_start
    AND o.created_at < (v_week_end + INTERVAL '1 day')
    AND o.status NOT IN ('cancelled', 'refunded')
    AND NOT EXISTS (
      SELECT 1 FROM orders prev
      WHERE prev.customer_email = o.customer_email
        AND prev.created_at < p_week_start
        AND prev.status NOT IN ('cancelled', 'refunded')
    );

  -- Clients récurrents
  SELECT COUNT(DISTINCT customer_email)
  INTO v_returning_customers
  FROM orders o
  WHERE o.created_at >= p_week_start
    AND o.created_at < (v_week_end + INTERVAL '1 day')
    AND o.status NOT IN ('cancelled', 'refunded')
    AND EXISTS (
      SELECT 1 FROM orders prev
      WHERE prev.customer_email = o.customer_email
        AND prev.created_at < p_week_start
        AND prev.status NOT IN ('cancelled', 'refunded')
    );

  -- Uploads de listes scolaires
  SELECT COALESCE(COUNT(*), 0)
  INTO v_school_uploads
  FROM school_list_uploads
  WHERE created_at >= p_week_start
    AND created_at < (v_week_end + INTERVAL '1 day');

  -- Conversion liste scolaire → commande (uploads ayant généré un panier validé)
  IF v_school_uploads > 0 THEN
    SELECT COALESCE(COUNT(DISTINCT slu.id), 0)
    INTO v_school_with_orders
    FROM school_list_uploads slu
    INNER JOIN school_list_carts slc ON slc.upload_id = slu.id
    WHERE slu.created_at >= p_week_start
      AND slu.created_at < (v_week_end + INTERVAL '1 day');

    v_school_conversion := v_school_with_orders::NUMERIC / v_school_uploads;
  END IF;

  -- Erreurs sync Shopify
  SELECT COALESCE(COUNT(*), 0)
  INTO v_sync_errors
  FROM shopify_sync_log
  WHERE synced_at >= p_week_start::TIMESTAMPTZ
    AND synced_at < (v_week_end + INTERVAL '1 day')::TIMESTAMPTZ
    AND status = 'error';

  -- Marge brute moyenne pondérée sur les ventes de la semaine
  SELECT COALESCE(
    SUM(
      CASE WHEN p.cost_price IS NOT NULL AND p.cost_price > 0 AND oi.product_price > 0
        THEN (oi.product_price - p.cost_price) / oi.product_price * oi.quantity
        ELSE NULL
      END
    ) / NULLIF(
      SUM(
        CASE WHEN p.cost_price IS NOT NULL AND p.cost_price > 0 AND oi.product_price > 0
          THEN oi.quantity
          ELSE NULL
        END
      ), 0
    ),
    0
  )
  INTO v_avg_margin
  FROM order_items oi
  INNER JOIN orders o ON o.id = oi.order_id
  INNER JOIN products p ON p.id = oi.product_id
  WHERE o.created_at >= p_week_start
    AND o.created_at < (v_week_end + INTERVAL '1 day')
    AND o.status NOT IN ('cancelled', 'refunded');

  -- Upsert du snapshot
  INSERT INTO kpi_snapshots (
    week_start, sessions, organic_sessions,
    orders, revenue_ttc, aov,
    conversion_rate, cart_abandonment_rate,
    school_list_uploads, school_list_conversion_rate,
    new_customers, returning_customers,
    shopify_sync_errors, avg_margin_rate
  ) VALUES (
    p_week_start, 0, 0,
    v_orders, v_revenue, v_aov,
    0, 0,
    v_school_uploads, v_school_conversion,
    v_new_customers, v_returning_customers,
    v_sync_errors, v_avg_margin
  )
  ON CONFLICT (week_start) DO UPDATE SET
    orders = EXCLUDED.orders,
    revenue_ttc = EXCLUDED.revenue_ttc,
    aov = EXCLUDED.aov,
    school_list_uploads = EXCLUDED.school_list_uploads,
    school_list_conversion_rate = EXCLUDED.school_list_conversion_rate,
    new_customers = EXCLUDED.new_customers,
    returning_customers = EXCLUDED.returning_customers,
    shopify_sync_errors = EXCLUDED.shopify_sync_errors,
    avg_margin_rate = EXCLUDED.avg_margin_rate,
    updated_at = NOW();
END;
$$;
