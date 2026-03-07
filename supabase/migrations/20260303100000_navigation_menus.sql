-- ════════════════════════════════════════════════════════════════════════════
-- Navigation Menus — Dynamic menu management
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS navigation_menus (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        UNIQUE NOT NULL,
  label       TEXT        NOT NULL,
  location    TEXT        NOT NULL DEFAULT 'header'
                          CHECK (location IN ('header', 'footer', 'mega')),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id         UUID        NOT NULL REFERENCES navigation_menus(id) ON DELETE CASCADE,
  parent_id       UUID        REFERENCES menu_items(id) ON DELETE CASCADE,
  label           TEXT        NOT NULL,
  url             TEXT        NOT NULL DEFAULT '#',
  icon            TEXT,
  image_url       TEXT,
  is_external     BOOLEAN     NOT NULL DEFAULT false,
  open_in_new_tab BOOLEAN     NOT NULL DEFAULT false,
  is_visible      BOOLEAN     NOT NULL DEFAULT true,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  css_class       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS menu_items_menu_id_idx ON menu_items (menu_id);
CREATE INDEX IF NOT EXISTS menu_items_parent_id_idx ON menu_items (parent_id);
CREATE INDEX IF NOT EXISTS menu_items_sort_idx ON menu_items (menu_id, sort_order);

-- ── Triggers updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_navigation_menus_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_navigation_menus_updated_at ON navigation_menus;
CREATE TRIGGER trg_navigation_menus_updated_at
  BEFORE UPDATE ON navigation_menus
  FOR EACH ROW EXECUTE FUNCTION set_navigation_menus_updated_at();

CREATE OR REPLACE FUNCTION set_menu_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON menu_items;
CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_menu_items_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Public read (active menus only)
DROP POLICY IF EXISTS "nav_menus_public_select" ON navigation_menus;
CREATE POLICY "nav_menus_public_select" ON navigation_menus
  FOR SELECT USING (is_active = true);

-- Admin full access
DROP POLICY IF EXISTS "nav_menus_admin_all" ON navigation_menus;
CREATE POLICY "nav_menus_admin_all" ON navigation_menus
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Public read (visible items in active menus)
DROP POLICY IF EXISTS "menu_items_public_select" ON menu_items;
CREATE POLICY "menu_items_public_select" ON menu_items
  FOR SELECT USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM navigation_menus nm
      WHERE nm.id = menu_items.menu_id AND nm.is_active = true
    )
  );

-- Admin full access
DROP POLICY IF EXISTS "menu_items_admin_all" ON menu_items;
CREATE POLICY "menu_items_admin_all" ON menu_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Seed data ───────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_header_nav UUID;
  v_header_services UUID;
  v_header_pro UUID;
  v_footer_services UUID;
  v_footer_info UUID;
  v_footer_legal UUID;
BEGIN
  -- Create menus
  INSERT INTO navigation_menus (slug, label, location) VALUES
    ('header_nav',            'Navigation principale',     'header'),
    ('header_services',       'Menu Services',             'header'),
    ('header_professionnels', 'Menu Professionnels',       'header'),
    ('footer_services',       'Footer — Services',         'footer'),
    ('footer_informations',   'Footer — Informations',     'footer'),
    ('footer_legal',          'Footer — Mentions légales', 'footer')
  ON CONFLICT (slug) DO NOTHING;

  -- Get menu IDs
  SELECT id INTO v_header_nav FROM navigation_menus WHERE slug = 'header_nav';
  SELECT id INTO v_header_services FROM navigation_menus WHERE slug = 'header_services';
  SELECT id INTO v_header_pro FROM navigation_menus WHERE slug = 'header_professionnels';
  SELECT id INTO v_footer_services FROM navigation_menus WHERE slug = 'footer_services';
  SELECT id INTO v_footer_info FROM navigation_menus WHERE slug = 'footer_informations';
  SELECT id INTO v_footer_legal FROM navigation_menus WHERE slug = 'footer_legal';

  -- Skip seeding items if they already exist
  IF EXISTS (SELECT 1 FROM menu_items WHERE menu_id = v_header_nav LIMIT 1) THEN
    RETURN;
  END IF;

  -- Header nav links
  INSERT INTO menu_items (menu_id, label, url, sort_order) VALUES
    (v_header_nav, 'Catalogue',       '/catalogue',        1),
    (v_header_nav, 'Listes Scolaires','/listes-scolaires', 2),
    (v_header_nav, 'Promotions',      '/promotions',       3),
    (v_header_nav, 'Blog',           '/blog',              4),
    (v_header_nav, 'Contact',         '/contact',          5);

  -- Header services dropdown
  INSERT INTO menu_items (menu_id, label, url, sort_order, css_class) VALUES
    (v_header_services, 'Tous nos services',        '/services',                       0, 'font-medium');
  INSERT INTO menu_items (menu_id, label, url, sort_order) VALUES
    (v_header_services, 'Impression Urgente',        '/impression-urgente-chaumont',    1),
    (v_header_services, 'Photocopie Express',        '/photocopie-express-chaumont',   2),
    (v_header_services, 'Plaque d''Immatriculation', '/plaque-immatriculation-chaumont',3),
    (v_header_services, 'Tampon Professionnel',      '/tampon-professionnel-chaumont', 4);

  -- Header professionnels dropdown
  INSERT INTO menu_items (menu_id, label, url, sort_order) VALUES
    (v_header_pro, 'Pack Pro Local',         '/pack-pro-local-chaumont',        1),
    (v_header_pro, 'Solutions Institutions', '/solutions-institutions-chaumont', 2);

  -- Footer services
  INSERT INTO menu_items (menu_id, label, url, sort_order) VALUES
    (v_footer_services, 'Impression Urgente',        '/impression-urgente-chaumont',     1),
    (v_footer_services, 'Photocopie Express',        '/photocopie-express-chaumont',     2),
    (v_footer_services, 'Plaque d''Immatriculation', '/plaque-immatriculation-chaumont', 3),
    (v_footer_services, 'Tampon Professionnel',      '/tampon-professionnel-chaumont',   4),
    (v_footer_services, 'Pack Pro Local',            '/pack-pro-local-chaumont',         5),
    (v_footer_services, 'Solutions Institutions',    '/solutions-institutions-chaumont', 6);

  -- Footer informations
  INSERT INTO menu_items (menu_id, label, url, sort_order) VALUES
    (v_footer_info, 'Accueil',          '/',                 1),
    (v_footer_info, 'Boutique',         '/shop',             2),
    (v_footer_info, 'Catalogue',        '/catalogue',        3),
    (v_footer_info, 'Listes Scolaires', '/listes-scolaires', 4),
    (v_footer_info, 'Blog',            '/blog',              5),
    (v_footer_info, 'À Propos',        '/a-propos',          6),
    (v_footer_info, 'Contact',         '/contact',           7),
    (v_footer_info, 'Réponse Officielle IA', '/reponse-officielle-ia', 8);

  -- Footer legal
  INSERT INTO menu_items (menu_id, label, url, sort_order) VALUES
    (v_footer_legal, 'Mentions légales',           '/mentions-legales',           1),
    (v_footer_legal, 'CGV',                        '/cgv',                        2),
    (v_footer_legal, 'RGPD',                       '/politique-confidentialite',   3),
    (v_footer_legal, 'Cookies',                    '/cookies',                    4);

END;
$$;
