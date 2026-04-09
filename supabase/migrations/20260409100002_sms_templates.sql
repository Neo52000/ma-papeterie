-- Admin-editable SMS templates with {{variable}} placeholders

CREATE TABLE public.sms_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT UNIQUE NOT NULL,
  label          TEXT NOT NULL,
  body_template  TEXT NOT NULL,
  variables      TEXT[] NOT NULL DEFAULT '{}',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  updated_at     TIMESTAMPTZ DEFAULT now(),
  updated_by     UUID REFERENCES auth.users(id)
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_sms_templates"
  ON public.sms_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Authenticated users can read templates (needed for send-sms function context)
CREATE POLICY "authenticated_read_sms_templates"
  ON public.sms_templates FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seed default French templates
INSERT INTO public.sms_templates (slug, label, body_template, variables) VALUES
  ('order_confirmed', 'Commande confirmée',
   'Ma Papeterie: Votre commande {{order_number}} est confirmée. Suivez-la sur {{tracking_url}}',
   ARRAY['order_number', 'tracking_url', 'customer_name']),

  ('order_shipped', 'Commande expédiée',
   'Ma Papeterie: Votre commande {{order_number}} a été expédiée ! Suivi: {{tracking_url}}',
   ARRAY['order_number', 'tracking_url', 'customer_name']),

  ('order_delivered', 'Commande livrée',
   'Ma Papeterie: Votre commande {{order_number}} a été livrée. Merci pour votre confiance !',
   ARRAY['order_number', 'customer_name']),

  ('order_cancelled', 'Commande annulée',
   'Ma Papeterie: Votre commande {{order_number}} a été annulée. Contactez-nous pour toute question.',
   ARRAY['order_number', 'customer_name']),

  ('service_order_ready', 'Service prêt',
   'Ma Papeterie: Votre commande {{service_type}} {{order_number}} est prête ! {{delivery_info}}',
   ARRAY['order_number', 'service_type', 'delivery_info', 'customer_name']),

  ('wishlist_price_drop', 'Baisse de prix favoris',
   'Ma Papeterie: {{product_name}} est en promo à {{new_price}}. Profitez-en sur ma-papeterie.fr',
   ARRAY['product_name', 'new_price', 'old_price']),

  ('wishlist_back_in_stock', 'Retour en stock favoris',
   'Ma Papeterie: {{product_name}} est de nouveau disponible ! Commandez sur ma-papeterie.fr',
   ARRAY['product_name']),

  ('promotional', 'Campagne promotionnelle',
   '{{message}} STOP SMS: répondez STOP',
   ARRAY['message'])
ON CONFLICT (slug) DO NOTHING;
