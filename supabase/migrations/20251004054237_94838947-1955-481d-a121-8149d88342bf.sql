-- Insert demo schools in different cities
INSERT INTO public.schools (id, name, address, postal_code, city, school_type, official_code) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'École Élémentaire Jean Moulin', '12 rue de la République', '75001', 'Paris', 'primaire', 'P75001'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Collège Victor Hugo', '45 avenue des Champs', '69001', 'Lyon', 'collège', 'C69001'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Lycée Voltaire', '78 boulevard de la Liberté', '13001', 'Marseille', 'lycée', 'L13001'),
  ('d4e5f6a7-b8c9-0123-def1-234567890123', 'École Primaire Jules Ferry', '23 rue Pasteur', '75015', 'Paris', 'primaire', 'P75015'),
  ('e5f6a7b8-c9d0-1234-ef12-345678901234', 'Collège Marie Curie', '56 place de la Mairie', '69003', 'Lyon', 'collège', 'C69003');

-- Insert demo school lists
INSERT INTO public.school_lists (id, school_id, class_level, school_year, list_name, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CP', '2024-2025', 'Liste fournitures CP', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CE1', '2024-2025', 'Liste fournitures CE1', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '6ème', '2024-2025', 'Liste fournitures 6ème', 'active'),
  ('44444444-4444-4444-4444-444444444444', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '5ème', '2024-2025', 'Liste fournitures 5ème', 'active'),
  ('55555555-5555-5555-5555-555555555555', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Seconde', '2024-2025', 'Liste fournitures Seconde', 'active'),
  ('66666666-6666-6666-6666-666666666666', 'd4e5f6a7-b8c9-0123-def1-234567890123', 'CE2', '2024-2025', 'Liste fournitures CE2', 'active'),
  ('77777777-7777-7777-7777-777777777777', 'e5f6a7b8-c9d0-1234-ef12-345678901234', '4ème', '2024-2025', 'Liste fournitures 4ème', 'active');

-- Insert demo list items for CP
INSERT INTO public.school_list_items (list_id, item_name, description, quantity, is_mandatory) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Cahier grands carreaux 24x32', 'Cahier 96 pages, grands carreaux Séyès', 3, true),
  ('11111111-1111-1111-1111-111111111111', 'Cahier petits carreaux 17x22', 'Cahier 96 pages, petits carreaux', 2, true),
  ('11111111-1111-1111-1111-111111111111', 'Trousse simple', 'Trousse en tissu ou plastique', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'Stylos bleus', 'Stylos bille bleus', 4, true),
  ('11111111-1111-1111-1111-111111111111', 'Crayons HB', 'Crayons à papier HB', 3, true),
  ('11111111-1111-1111-1111-111111111111', 'Gomme blanche', 'Gomme sans PVC', 2, true),
  ('11111111-1111-1111-1111-111111111111', 'Règle 30cm', 'Règle plate transparente', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'Crayons de couleur', 'Boîte de 12 crayons de couleur', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'Feutres', 'Boîte de 12 feutres lavables', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'Colle en stick', 'Colle blanche en stick 20g', 3, true);

-- Insert demo list items for 6ème
INSERT INTO public.school_list_items (list_id, item_name, description, quantity, is_mandatory) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Classeur grand format', 'Classeur A4 dos 40mm', 3, true),
  ('33333333-3333-3333-3333-333333333333', 'Feuilles simples', 'Paquet de 100 feuilles grands carreaux perforées', 2, true),
  ('33333333-3333-3333-3333-333333333333', 'Feuilles doubles', 'Paquet de 100 feuilles grands carreaux perforées', 1, true),
  ('33333333-3333-3333-3333-333333333333', 'Intercalaires', 'Jeu de 6 intercalaires carton', 3, true),
  ('33333333-3333-3333-3333-333333333333', 'Stylos 4 couleurs', 'Stylos bille bleu, noir, rouge, vert', 5, true),
  ('33333333-3333-3333-3333-333333333333', 'Cahier de brouillon', 'Cahier 96 pages grands carreaux', 2, true),
  ('33333333-3333-3333-3333-333333333333', 'Calculatrice collège', 'Calculatrice scientifique', 1, true),
  ('33333333-3333-3333-3333-333333333333', 'Compas', 'Compas métal avec bague de sécurité', 1, true),
  ('33333333-3333-3333-3333-333333333333', 'Équerre 21cm', 'Équerre transparente 60°', 1, true),
  ('33333333-3333-3333-3333-333333333333', 'Rapporteur', 'Rapporteur 180° transparent', 1, true),
  ('33333333-3333-3333-3333-333333333333', 'Surligneurs', 'Lot de 4 surligneurs couleurs assorties', 1, true);

-- Insert demo list items for Seconde
INSERT INTO public.school_list_items (list_id, item_name, description, quantity, is_mandatory) VALUES
  ('55555555-5555-5555-5555-555555555555', 'Classeur souple', 'Classeur A4 dos 30mm', 4, true),
  ('55555555-5555-5555-5555-555555555555', 'Copies doubles', 'Lot de 200 feuilles grands carreaux perforées', 3, true),
  ('55555555-5555-5555-5555-555555555555', 'Stylos noirs', 'Lot de 5 stylos bille noirs', 2, true),
  ('55555555-5555-5555-5555-555555555555', 'Calculatrice graphique', 'Calculatrice graphique lycée', 1, true),
  ('55555555-5555-5555-5555-555555555555', 'Kit de géométrie', 'Règle, équerre, compas, rapporteur', 1, true),
  ('55555555-5555-5555-5555-555555555555', 'Pochettes plastique', 'Lot de 50 pochettes perforées', 1, true),
  ('55555555-5555-5555-5555-555555555555', 'Porte-vues', 'Porte-vues 80 vues', 2, true),
  ('55555555-5555-5555-5555-555555555555', 'Cahier de texte', 'Agenda ou cahier de texte', 1, true);

-- Insert demo list items for CE1
INSERT INTO public.school_list_items (list_id, item_name, description, quantity, is_mandatory) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Cahier 24x32', 'Cahier 96 pages grands carreaux', 4, true),
  ('22222222-2222-2222-2222-222222222222', 'Cahier de travaux pratiques', 'Cahier TP 96 pages', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Stylos bleus', 'Lot de 5 stylos bille bleus', 2, true),
  ('22222222-2222-2222-2222-222222222222', 'Crayons à papier', 'Lot de 6 crayons HB', 2, true),
  ('22222222-2222-2222-2222-222222222222', 'Taille-crayon', 'Taille-crayon avec réservoir', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Gommes', 'Lot de 3 gommes blanches', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Feutres ardoise', 'Lot de 4 feutres effaçables', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Pochette élastique', 'Pochette A4 avec élastiques', 1, true);