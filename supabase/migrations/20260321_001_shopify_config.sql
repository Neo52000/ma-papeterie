-- Table de configuration Shopify (une seule ligne active)
CREATE TABLE IF NOT EXISTS public.shopify_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain TEXT NOT NULL,                        -- ex: ma-papeterie.myshopify.com
  api_version TEXT NOT NULL DEFAULT '2025-01',
  access_token_set BOOLEAN DEFAULT false,           -- true si token configuré (jamais le token lui-même)
  webhook_secret_set BOOLEAN DEFAULT false,         -- idem
  pos_active BOOLEAN DEFAULT false,                 -- false jusqu'activation POS
  pos_location_id TEXT DEFAULT NULL,                -- rempli lors de l'activation POS
  sync_collections BOOLEAN DEFAULT true,            -- flag sync collections (_shared/shopify-config.ts)
  sync_metafields BOOLEAN DEFAULT true,             -- flag sync metafields (_shared/shopify-config.ts)
  webhook_secret TEXT DEFAULT NULL,                  -- secret HMAC pour vérif webhooks (shopify-webhook)
  last_full_sync_at TIMESTAMPTZ DEFAULT NULL,        -- dernière sync complète (pull-shopify-orders)
  last_health_check TIMESTAMPTZ DEFAULT NULL,
  health_status TEXT DEFAULT 'unknown'              -- 'connected' | 'error' | 'unreachable' | 'unknown'
    CHECK (health_status IN ('connected', 'error', 'unreachable', 'unknown')),
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Une seule ligne autorisée
CREATE UNIQUE INDEX IF NOT EXISTS shopify_config_single_row ON public.shopify_config((true));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_shopify_config_updated_at
  BEFORE UPDATE ON public.shopify_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.shopify_config ENABLE ROW LEVEL SECURITY;
-- Aucune policy publique — accès uniquement via service_role dans Edge Functions

-- Seed initial
INSERT INTO public.shopify_config (shop_domain, api_version)
VALUES ('ma-papeterie.myshopify.com', '2025-01')
ON CONFLICT DO NOTHING;
