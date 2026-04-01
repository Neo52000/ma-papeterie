-- Add 4 premium printing service links to header and footer navigation menus
DO $$
DECLARE
  v_header_services UUID;
  v_footer_services UUID;
BEGIN
  SELECT id INTO v_header_services FROM navigation_menus WHERE slug = 'header_services';
  SELECT id INTO v_footer_services FROM navigation_menus WHERE slug = 'footer_services';

  -- Skip if menus don't exist
  IF v_header_services IS NULL OR v_footer_services IS NULL THEN
    RAISE NOTICE 'Navigation menus not found, skipping premium printing items';
    RETURN;
  END IF;

  -- Header services: add 4 premium printing items (sort_order 5-8)
  INSERT INTO menu_items (menu_id, label, url, sort_order) VALUES
    (v_header_services, 'Papier Peint Personnalisé', '/papier-peint-personnalise',    5),
    (v_header_services, 'Impression Fine Art',       '/impression-fine-art',           6),
    (v_header_services, 'Plans Techniques',          '/impression-plans-techniques',   7),
    (v_header_services, 'Patrons de Couture',        '/impression-patron-couture',     8);

  -- Footer services: add 4 premium printing items (sort_order 7-10)
  INSERT INTO menu_items (menu_id, label, url, sort_order) VALUES
    (v_footer_services, 'Papier Peint Personnalisé', '/papier-peint-personnalise',    7),
    (v_footer_services, 'Impression Fine Art',       '/impression-fine-art',           8),
    (v_footer_services, 'Plans Techniques',          '/impression-plans-techniques',   9),
    (v_footer_services, 'Patrons de Couture',        '/impression-patron-couture',    10);
END $$;
