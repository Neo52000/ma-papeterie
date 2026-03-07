-- Ajouter le lien Blog dans le menu header_nav
DO $$
DECLARE
  v_header_nav UUID;
BEGIN
  SELECT id INTO v_header_nav FROM navigation_menus WHERE slug = 'header_nav';

  -- Décaler Contact de sort_order 4 → 5
  UPDATE menu_items SET sort_order = 5 WHERE menu_id = v_header_nav AND url = '/contact';

  -- Ajouter Blog en position 4 (si pas déjà présent)
  INSERT INTO menu_items (menu_id, label, url, sort_order)
  SELECT v_header_nav, 'Blog', '/blog', 4
  WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE menu_id = v_header_nav AND url = '/blog'
  );
END;
$$;
