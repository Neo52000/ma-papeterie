-- Ajouter "Leasing Mobilier" dans les menus navigation DB

-- Menu header Professionnels
INSERT INTO menu_items (menu_id, label, url, sort_order, is_visible)
SELECT m.id, 'Leasing Mobilier', '/leasing-mobilier-bureau', 3, true
FROM navigation_menus m WHERE m.slug = 'header_professionnels';

-- Menu footer Services
INSERT INTO menu_items (menu_id, label, url, sort_order, is_visible)
SELECT m.id, 'Leasing Mobilier', '/leasing-mobilier-bureau', 7, true
FROM navigation_menus m WHERE m.slug = 'footer_services';
