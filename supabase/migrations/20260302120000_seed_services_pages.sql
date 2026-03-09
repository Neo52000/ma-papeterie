-- Seed: Espace Services Express pages (idempotent)
-- Adds layout column if missing + inserts 9 service pages

-- Ensure layout column exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'static_pages' AND column_name = 'layout'
  ) THEN
    ALTER TABLE public.static_pages ADD COLUMN layout TEXT DEFAULT 'article';
    ALTER TABLE public.static_pages ADD CONSTRAINT static_pages_layout_check CHECK (layout IN ('article', 'full-width'));
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. PAGE PRINCIPALE : Espace Services Express
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.static_pages (
  id, slug, title, meta_title, meta_description, h1, layout, status, published_at,
  schema_type, seo_score, json_ld, content
) VALUES (
  gen_random_uuid(),
  'services',
  'Espace Services Express',
  'Services Express — Impression, Copie, Tampons | Papeterie Reine & Fils Chaumont',
  'Tous vos services en magasin : impression express, photocopie, finition de documents, tampons personnalisés, plaques gravées, tirage photos. Service rapide à Chaumont.',
  'Espace Services Express',
  'full-width',
  'published',
  NOW(),
  'Service',
  85,
  '{"@context":"https://schema.org","@type":"Service","name":"Espace Services Express","provider":{"@type":"LocalBusiness","name":"Papeterie Reine & Fils","address":{"@type":"PostalAddress","addressLocality":"Chaumont","postalCode":"52000","addressCountry":"FR"}},"description":"Tous vos services en magasin : impression, copie, finition, tampons, gravure, photos.","areaServed":"Chaumont, Haute-Marne"}',
  '[
    {
      "id":"svc-hero-1","type":"hero",
      "slides":[
        {"title":"Espace Services Express","subtitle":"Impression, copie, finition — tout pour vos documents au même endroit","buttonText":"Découvrir nos services","buttonLink":"#services"},
        {"title":"Impression Express","subtitle":"Documents, affiches, flyers — qualité pro en quelques minutes","buttonText":"Voir les tarifs","buttonLink":"#tarifs"},
        {"title":"Tampons & Gravure","subtitle":"Tampons sur mesure, plaques gravées — fabrication rapide sur place","buttonText":"Commander","buttonLink":"#tampons"}
      ],
      "autoplay":true,"interval":5000
    },
    {
      "id":"svc-grid-1","type":"service_grid","columns":4,
      "displayMode":"image-card","cardHeight":"md",
      "settings":{"anchor":"services","padding":"lg"},
      "services":[
        {"icon":"Printer","title":"Impression & Copies","description":"Noir & blanc, couleur, recto-verso. À partir de 0.05€ la copie.","features":["Copies A4/A3","Impression couleur HD","Recto-verso auto","Papiers spéciaux"],"link":"/p/impression-copies","imageUrl":""},
        {"icon":"FileText","title":"Imprimerie & Supports","description":"Cartes de visite, flyers, affiches, brochures professionnelles.","features":["Cartes de visite","Flyers / Dépliants","Affiches tous formats","Brochures reliées"],"link":"/p/imprimerie-supports","imageUrl":""},
        {"icon":"Maximize","title":"Grand Format","description":"Impression grand format pour vos affiches, bâches et kakémonos.","features":["Posters A2/A1/A0","Bâches","Roll-up / Kakémono","Plans & cartes"],"link":"/p/grand-format","imageUrl":""},
        {"icon":"Scissors","title":"Finition & Protection","description":"Reliure, plastification, massicotage, pliage et mise sous pli.","features":["Reliure spirale/thermique","Plastification A4/A3","Découpe & massicotage","Pliage & agrafage"],"link":"/p/finition-protection","imageUrl":""},
        {"icon":"Stamp","title":"Tampons & Gravure","description":"Tampons encreurs personnalisés, plaques de bureau gravées.","features":["Tampons Trodat/Colop","Plaques gravées","Texte & logo","Fabrication express"],"link":"/p/tampons-gravure","imageUrl":""},
        {"icon":"Camera","title":"Tirage Photos","description":"Tirage photo instantané, agrandissements, albums personnalisés.","features":["Photos d''identité","Tirages 10x15 → 30x45","Albums photo","Cadres & supports"],"link":"/p/tirage-photos","imageUrl":""},
        {"icon":"Car","title":"Plaques & Clés","description":"Plaques d''immatriculation homologuées, duplication de clés.","features":["Plaques minéralogiques","Auto & moto","Duplication clés","Service rapide"],"link":"/p/plaques-cles","imageUrl":""},
        {"icon":"Building2","title":"Solutions Pro & B2B","description":"Services dédiés aux entreprises, devis personnalisés, livraison.","features":["Devis sur mesure","Compte professionnel","Livraison bureau","Abonnements mensuels"],"link":"/p/solutions-pro","imageUrl":""}
      ]
    },
    {
      "id":"svc-howto-1","type":"icon_features","columns":3,
      "settings":{"backgroundColor":"bg-muted/30","padding":"lg"},
      "features":[
        {"icon":"Upload","title":"1. Envoyez vos fichiers","description":"Par email, clé USB ou directement en magasin. Nous acceptons tous les formats."},
        {"icon":"Settings","title":"2. On s''en occupe","description":"Notre équipe traite votre commande avec soin et dans les meilleurs délais."},
        {"icon":"CheckCircle","title":"3. C''est prêt !","description":"Récupérez vos documents en magasin ou recevez-les par livraison."}
      ]
    },
    {
      "id":"svc-atouts-1","type":"icon_features","columns":4,
      "settings":{"padding":"lg"},
      "features":[
        {"icon":"Zap","title":"Express","description":"La plupart des services sont disponibles en moins d''une heure."},
        {"icon":"MapPin","title":"Local","description":"En plein centre de Chaumont, facile d''accès avec parking."},
        {"icon":"Shield","title":"Fiable","description":"Matériel professionnel, résultats garantis."},
        {"icon":"Euro","title":"Accessible","description":"Tarifs transparents et compétitifs, devis gratuit."}
      ]
    },
    {
      "id":"svc-faq-1","type":"faq",
      "settings":{"padding":"lg"},
      "questions":[
        {"q":"Quels formats de fichiers acceptez-vous ?","a":"Nous acceptons PDF, Word, PowerPoint, JPEG, PNG, AI et bien d''autres. En cas de doute, envoyez-nous votre fichier par email et nous vous confirmerons."},
        {"q":"Quels sont vos délais de réalisation ?","a":"La plupart des impressions sont prêtes en moins d''une heure. Pour les travaux d''imprimerie complexes (brochures, grands tirages), comptez 24 à 48h."},
        {"q":"Puis-je envoyer mes fichiers par email ?","a":"Oui ! Envoyez vos fichiers à contact@ma-papeterie.fr avec vos instructions. Nous vous confirmerons le devis par retour d''email."},
        {"q":"Proposez-vous des tarifs pour les professionnels ?","a":"Absolument. Nous proposons des tarifs dégressifs et des comptes professionnels avec facturation mensuelle. Contactez-nous pour un devis personnalisé."},
        {"q":"Où êtes-vous situés ?","a":"Nous sommes en plein centre-ville de Chaumont (52000), avec un parking à proximité. Retrouvez notre adresse exacte sur la page Contact."}
      ]
    },
    {
      "id":"svc-cta-1","type":"cta",
      "settings":{"padding":"lg"},
      "title":"Un projet ? Contactez-nous !",
      "description":"Notre équipe est à votre disposition pour tout renseignement ou devis gratuit.",
      "button":"Nous contacter","link":"/contact"
    }
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. SOUS-PAGE : Impression & Copies
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.static_pages (
  id, slug, title, meta_title, meta_description, h1, layout, status, published_at,
  schema_type, seo_score, json_ld, content
) VALUES (
  gen_random_uuid(),
  'impression-copies',
  'Impression & Copies',
  'Impression & Photocopie Express à Chaumont | Papeterie Reine & Fils',
  'Service d''impression et photocopie express à Chaumont. Copies N&B et couleur, A4/A3, recto-verso, papiers spéciaux. À partir de 0.05€. Service rapide en magasin.',
  'Impression & Copies Express',
  'full-width',
  'published',
  NOW(),
  'Service',
  80,
  '{"@context":"https://schema.org","@type":"Service","name":"Impression & Copies Express","provider":{"@type":"LocalBusiness","name":"Papeterie Reine & Fils","address":{"@type":"PostalAddress","addressLocality":"Chaumont","postalCode":"52000"}},"description":"Impression et photocopie express N&B et couleur à Chaumont.","areaServed":"Chaumont"}',
  '[
    {"id":"imp-hero","type":"hero","slides":[{"title":"Impression & Copies Express","subtitle":"Noir & blanc, couleur, recto-verso — qualité professionnelle à petit prix","buttonText":"Voir les tarifs","buttonLink":"#tarifs"}],"autoplay":false},
    {"id":"imp-desc","type":"image_text","imagePosition":"right","title":"Votre espace impression à Chaumont","text":"Que vous ayez besoin d''une simple photocopie ou d''un tirage couleur haute définition, notre espace impression est équipé pour répondre à toutes vos demandes. Apportez vos documents sur clé USB, envoyez-les par email ou imprimez directement depuis votre téléphone. Notre équipe est là pour vous accompagner.","buttonText":"Nous contacter","buttonLink":"/contact"},
    {"id":"imp-tarifs","type":"pricing_table","settings":{"anchor":"tarifs","padding":"lg"},"plans":[{"name":"Copie N&B","price":"0.05€","period":"page","features":["A4 recto","Papier 80g standard","À partir de 1 copie","Tarif dégressif dès 100 copies"],"buttonText":"En magasin","buttonLink":"/contact"},{"name":"Copie Couleur","price":"0.25€","period":"page","features":["A4 recto couleur HD","Papier 90g qualité","Fidélité des couleurs","Tarif dégressif dès 50 copies"],"highlighted":true,"buttonText":"En magasin","buttonLink":"/contact"},{"name":"A3 Couleur","price":"0.50€","period":"page","features":["A3 recto couleur","Idéal affiches & plans","Papier 90g ou 120g","Impression HD"],"buttonText":"En magasin","buttonLink":"/contact"}]},
    {"id":"imp-feat","type":"icon_features","columns":4,"settings":{"padding":"lg"},"features":[{"icon":"Zap","title":"Express","description":"La plupart des impressions prêtes en quelques minutes."},{"icon":"Palette","title":"Couleur HD","description":"Impression haute définition, fidélité des couleurs garantie."},{"icon":"Smartphone","title":"Depuis votre mobile","description":"Imprimez directement depuis votre téléphone ou tablette."},{"icon":"BadgePercent","title":"Tarifs dégressifs","description":"Plus vous imprimez, moins ça coûte. Demandez un devis."}]},
    {"id":"imp-faq","type":"faq","settings":{"padding":"lg"},"questions":[{"q":"Quels formats de papier proposez-vous ?","a":"Nous proposons les formats A4, A3, et des papiers spéciaux (épais 120g/160g, photo mat et brillant, transparent, autocollant)."},{"q":"Puis-je imprimer depuis mon téléphone ?","a":"Oui ! Envoyez votre fichier par email à notre adresse ou utilisez notre borne d''impression en libre-service."},{"q":"Acceptez-vous les fichiers Word et PowerPoint ?","a":"Oui, nous acceptons PDF, Word, PowerPoint, Excel, JPEG, PNG et la plupart des formats courants."}]},
    {"id":"imp-cta","type":"cta","settings":{"padding":"lg"},"title":"Besoin d''impressions ?","description":"Passez en magasin ou envoyez vos fichiers par email pour un devis gratuit.","button":"Nous contacter","link":"/contact"}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. SOUS-PAGE : Imprimerie & Supports
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.static_pages (
  id, slug, title, meta_title, meta_description, h1, layout, status, published_at,
  schema_type, seo_score, json_ld, content
) VALUES (
  gen_random_uuid(),
  'imprimerie-supports',
  'Imprimerie & Supports',
  'Imprimerie — Cartes de visite, Flyers, Affiches à Chaumont | Papeterie Reine & Fils',
  'Imprimerie professionnelle à Chaumont : cartes de visite, flyers, dépliants, affiches, brochures. Qualité pro, prix compétitifs, fabrication rapide.',
  'Imprimerie & Supports de Communication',
  'full-width',
  'published',
  NOW(),
  'Service',
  80,
  '{"@context":"https://schema.org","@type":"Service","name":"Imprimerie & Supports de Communication","provider":{"@type":"LocalBusiness","name":"Papeterie Reine & Fils","address":{"@type":"PostalAddress","addressLocality":"Chaumont","postalCode":"52000"}},"description":"Impression de cartes de visite, flyers, affiches et brochures à Chaumont."}',
  '[
    {"id":"impr-hero","type":"hero","slides":[{"title":"Imprimerie & Supports","subtitle":"Cartes de visite, flyers, affiches, brochures — qualité professionnelle","buttonText":"Demander un devis","buttonLink":"/contact"}],"autoplay":false},
    {"id":"impr-desc","type":"image_text","imagePosition":"left","title":"Vos supports de communication sur mesure","text":"De la carte de visite au dépliant 3 volets, en passant par les affiches grand format et les brochures reliées, nous réalisons tous vos supports de communication. Envoyez-nous votre maquette ou faites appel à notre service de mise en page pour un résultat professionnel."},
    {"id":"impr-grid","type":"service_grid","columns":3,"displayMode":"icon","services":[{"icon":"CreditCard","title":"Cartes de visite","description":"Impression recto/verso, papier 350g mat ou brillant, pelliculage disponible.","features":["À partir de 100 ex.","Pelliculage mat/brillant","Coins arrondis option"]},{"icon":"Newspaper","title":"Flyers & Dépliants","description":"Flyers A5/A4, dépliants 2 ou 3 volets, papier 135g ou 250g.","features":["Formats A5, A4, DL","2 ou 3 volets","Papier recyclé dispo"]},{"icon":"Image","title":"Affiches","description":"Affiches A3 à A0, papier couché 135g ou 250g, finition brillante ou mate.","features":["Formats A3 à A0","Papier couché","Plastification option"]}]},
    {"id":"impr-feat","type":"icon_features","columns":4,"settings":{"padding":"lg"},"features":[{"icon":"Palette","title":"Qualité pro","description":"Impression offset et numérique haute qualité."},{"icon":"Clock","title":"Délai rapide","description":"Cartes de visite en 24-48h, flyers en 48-72h."},{"icon":"PenTool","title":"Mise en page","description":"Service de création graphique si besoin."},{"icon":"BadgePercent","title":"Petits tirages OK","description":"Pas de minimum, idéal pour les petites structures."}]},
    {"id":"impr-faq","type":"faq","settings":{"padding":"lg"},"questions":[{"q":"Faites-vous de la création graphique ?","a":"Oui, nous proposons un service de mise en page et création graphique. Apportez votre logo et vos textes, nous nous occupons du reste."},{"q":"Quel est le délai pour des cartes de visite ?","a":"Comptez 24 à 48h pour des cartes de visite standard. Un service express le jour même est possible sur demande."},{"q":"Peut-on imprimer en petite quantité ?","a":"Absolument ! Nous n''avons pas de minimum de commande. L''impression numérique permet des tirages à partir de 1 exemplaire."}]},
    {"id":"impr-cta","type":"cta","settings":{"padding":"lg"},"title":"Un projet d''impression ?","description":"Envoyez-nous votre maquette ou demandez un devis personnalisé.","button":"Demander un devis","link":"/contact"}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. SOUS-PAGE : Grand Format
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.static_pages (
  id, slug, title, meta_title, meta_description, h1, layout, status, published_at,
  schema_type, seo_score, json_ld, content
) VALUES (
  gen_random_uuid(),
  'grand-format',
  'Grand Format',
  'Impression Grand Format à Chaumont — Bâches, Kakémonos, Posters | Papeterie Reine & Fils',
  'Impression grand format à Chaumont : posters A2/A1/A0, bâches, roll-up, kakémonos, plans d''architecte. Qualité professionnelle, délai rapide.',
  'Impression Grand Format',
  'full-width',
  'published',
  NOW(),
  'Service',
  78,
  '{"@context":"https://schema.org","@type":"Service","name":"Impression Grand Format","provider":{"@type":"LocalBusiness","name":"Papeterie Reine & Fils","address":{"@type":"PostalAddress","addressLocality":"Chaumont","postalCode":"52000"}},"description":"Impression grand format : posters, bâches, kakémonos, roll-up à Chaumont."}',
  '[
    {"id":"gf-hero","type":"hero","slides":[{"title":"Impression Grand Format","subtitle":"Posters, bâches, kakémonos, roll-up — voyez les choses en grand","buttonText":"Demander un devis","buttonLink":"/contact"}],"autoplay":false},
    {"id":"gf-desc","type":"image_text","imagePosition":"right","title":"Imprimez en grand, impressionnez en grand","text":"Notre imprimante grand format permet de réaliser des affiches jusqu''au format A0, des bâches publicitaires, des kakémonos et roll-up pour vos événements. Qualité photo, couleurs éclatantes et supports variés (papier, vinyle, bâche, textile)."},
    {"id":"gf-feat","type":"icon_features","columns":4,"settings":{"padding":"lg"},"features":[{"icon":"Maximize","title":"Jusqu''à A0+","description":"Impression jusqu''à 120cm de large, longueur illimitée."},{"icon":"Image","title":"Qualité photo","description":"Résolution 1440 dpi, couleurs éclatantes."},{"icon":"Layers","title":"Supports variés","description":"Papier, vinyle, bâche PVC, textile, canvas."},{"icon":"Zap","title":"Rapide","description":"Posters prêts en 1h, bâches en 24-48h."}]},
    {"id":"gf-faq","type":"faq","settings":{"padding":"lg"},"questions":[{"q":"Quelle est la taille maximale d''impression ?","a":"Nous imprimons jusqu''à 120cm de largeur avec une longueur théoriquement illimitée. Pour les très grands formats, nous assemblons plusieurs lés."},{"q":"Faites-vous des roll-up / kakémonos ?","a":"Oui ! Nous fournissons l''impression et le support (structure roll-up). Idéal pour les salons et événements."},{"q":"Peut-on imprimer des plans d''architecte ?","a":"Absolument, nous imprimons des plans A1 et A0, en noir & blanc ou couleur, sur papier standard ou calque."}]},
    {"id":"gf-cta","type":"cta","settings":{"padding":"lg"},"title":"Un projet grand format ?","description":"Envoyez votre fichier pour un devis rapide et gratuit.","button":"Demander un devis","link":"/contact"}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. SOUS-PAGE : Finition & Protection
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.static_pages (
  id, slug, title, meta_title, meta_description, h1, layout, status, published_at,
  schema_type, seo_score, json_ld, content
) VALUES (
  gen_random_uuid(),
  'finition-protection',
  'Finition & Protection',
  'Reliure, Plastification, Massicotage à Chaumont | Papeterie Reine & Fils',
  'Services de finition à Chaumont : reliure spirale et thermique, plastification A4/A3, massicotage, pliage, agrafage. Protégez et valorisez vos documents.',
  'Finition & Protection de Documents',
  'full-width',
  'published',
  NOW(),
  'Service',
  78,
  '{"@context":"https://schema.org","@type":"Service","name":"Finition & Protection de Documents","provider":{"@type":"LocalBusiness","name":"Papeterie Reine & Fils","address":{"@type":"PostalAddress","addressLocality":"Chaumont","postalCode":"52000"}},"description":"Reliure, plastification, massicotage et finition de documents à Chaumont."}',
  '[
    {"id":"fin-hero","type":"hero","slides":[{"title":"Finition & Protection","subtitle":"Reliure, plastification, massicotage — la touche finale pour vos documents","buttonText":"En savoir plus","buttonLink":"#services"}],"autoplay":false},
    {"id":"fin-desc","type":"image_text","imagePosition":"left","title":"Protégez et valorisez vos documents","text":"Donnez une finition professionnelle à vos documents : reliure spirale ou thermique pour vos rapports, plastification pour protéger vos affiches et menus, massicotage de précision pour des découpes nettes. Service rapide, réalisé sur place."},
    {"id":"fin-grid","type":"service_grid","columns":3,"displayMode":"icon","settings":{"anchor":"services","padding":"lg"},"services":[{"icon":"BookOpen","title":"Reliure","description":"Spirale plastique ou métal, reliure thermique, couvertures transparentes ou opaques.","features":["Spirale plastique","Spirale métal","Thermocollée","Jusqu''à 500 pages"]},{"icon":"Shield","title":"Plastification","description":"Plastification à chaud A4 et A3, brillante ou mate. Idéal pour menus, affiches, badges.","features":["A4 et A3","Brillant ou mat","75 à 250 microns","Express 5 min"]},{"icon":"Scissors","title":"Découpe & Massicotage","description":"Massicotage de précision, découpe à façon, arrondissage de coins.","features":["Massicot précision","Découpe sur mesure","Coins arrondis","Pliage & rainage"]}]},
    {"id":"fin-faq","type":"faq","settings":{"padding":"lg"},"questions":[{"q":"Combien de temps prend une reliure ?","a":"Une reliure spirale est prête en 5 à 10 minutes. La reliure thermique nécessite un temps de chauffe, comptez 15 minutes environ."},{"q":"Peut-on plastifier un document A3 ?","a":"Oui, nous plastifions en A4 et A3, en finition brillante ou mate, de 75 à 250 microns d''épaisseur."},{"q":"Faites-vous du pliage ?","a":"Oui, nous proposons le pliage (en 2, en 3, en Z, en portefeuille) et le rainage pour les papiers épais."}]},
    {"id":"fin-cta","type":"cta","settings":{"padding":"lg"},"title":"Des documents à relier ou plastifier ?","description":"Passez en magasin, c''est rapide et sans rendez-vous.","button":"Nous trouver","link":"/contact"}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. SOUS-PAGE : Tampons & Gravure
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.static_pages (
  id, slug, title, meta_title, meta_description, h1, layout, status, published_at,
  schema_type, seo_score, json_ld, content
) VALUES (
  gen_random_uuid(),
  'tampons-gravure',
  'Tampons & Gravure',
  'Tampons Personnalisés & Plaques Gravées à Chaumont | Papeterie Reine & Fils',
  'Fabrication de tampons encreurs personnalisés (Trodat, Colop) et plaques gravées à Chaumont. Texte et logo, fabrication express sur place.',
  'Tampons Personnalisés & Gravure',
  'full-width',
  'published',
  NOW(),
  'Service',
  82,
  '{"@context":"https://schema.org","@type":"Service","name":"Tampons Personnalisés & Gravure","provider":{"@type":"LocalBusiness","name":"Papeterie Reine & Fils","address":{"@type":"PostalAddress","addressLocality":"Chaumont","postalCode":"52000"}},"description":"Fabrication de tampons personnalisés et plaques gravées à Chaumont."}',
  '[
    {"id":"tamp-hero","type":"hero","slides":[{"title":"Tampons & Gravure","subtitle":"Tampons personnalisés, plaques gravées — fabrication express sur place","buttonText":"Commander","buttonLink":"/contact"}],"autoplay":false},
    {"id":"tamp-desc","type":"image_text","imagePosition":"right","title":"Tampons et gravure sur mesure","text":"Créez votre tampon encreur personnalisé en quelques minutes : adresse, logo, mentions légales, signature... Nous gravons également des plaques professionnelles (bureau, boîte aux lettres) et des signalétiques sur mesure. Marques Trodat et Colop, fabrication express en magasin."},
    {"id":"tamp-grid","type":"service_grid","columns":2,"displayMode":"icon","settings":{"padding":"lg"},"services":[{"icon":"Stamp","title":"Tampons Encreurs","description":"Trodat et Colop, tous formats. Texte seul ou texte + logo. Encre multi-couleurs disponible.","features":["Trodat Printy","Colop Printer","Texte + logo","Encre rechargeable"]},{"icon":"Award","title":"Plaques Gravées","description":"Plaques de bureau, boîte aux lettres, signalétique intérieure. Plusieurs matières et couleurs.","features":["Plaque laiton","Plaque alu brossé","Plexiglas gravé","Fixation fournie"]}]},
    {"id":"tamp-feat","type":"icon_features","columns":3,"settings":{"padding":"lg"},"features":[{"icon":"Zap","title":"Express","description":"Tampons standards fabriqués en 30 minutes sur place."},{"icon":"PenTool","title":"Personnalisation","description":"Texte libre, logo, QR code — tout est possible."},{"icon":"RotateCcw","title":"Rechargeable","description":"Encre et cassette remplaçables pour une durée de vie longue."}]},
    {"id":"tamp-faq","type":"faq","settings":{"padding":"lg"},"questions":[{"q":"Combien de temps pour fabriquer un tampon ?","a":"Un tampon standard est prêt en 30 minutes. Pour les tampons avec logo, comptez 1 à 2 heures selon la complexité."},{"q":"Peut-on ajouter un logo sur un tampon ?","a":"Oui ! Envoyez-nous votre logo en format vectoriel (AI, SVG, PDF) ou en haute résolution (300 dpi minimum)."},{"q":"Quelle est la durée de vie d''un tampon ?","a":"Un tampon Trodat ou Colop dure environ 10 000 à 20 000 empreintes. L''encre et la cassette sont rechargeables/remplaçables."}]},
    {"id":"tamp-cta","type":"cta","settings":{"padding":"lg"},"title":"Besoin d''un tampon personnalisé ?","description":"Passez en magasin ou envoyez-nous votre maquette par email.","button":"Commander","link":"/contact"}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- 7. SOUS-PAGE : Tirage Photos
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.static_pages (
  id, slug, title, meta_title, meta_description, h1, layout, status, published_at,
  schema_type, seo_score, json_ld, content
) VALUES (
  gen_random_uuid(),
  'tirage-photos',
  'Tirage Photos',
  'Tirage Photos & Albums à Chaumont | Papeterie Reine & Fils',
  'Tirage photo instantané à Chaumont : photos d''identité, tirages 10x15 à 30x45, albums personnalisés, agrandissements. Service rapide en magasin.',
  'Tirage Photos & Albums',
  'full-width',
  'published',
  NOW(),
  'Service',
  76,
  '{"@context":"https://schema.org","@type":"Service","name":"Tirage Photos & Albums","provider":{"@type":"LocalBusiness","name":"Papeterie Reine & Fils","address":{"@type":"PostalAddress","addressLocality":"Chaumont","postalCode":"52000"}},"description":"Tirage photo instantané, albums et agrandissements à Chaumont."}',
  '[
    {"id":"photo-hero","type":"hero","slides":[{"title":"Tirage Photos","subtitle":"Photos d''identité, tirages, albums — vos souvenirs imprimés en quelques minutes","buttonText":"En savoir plus","buttonLink":"#services"}],"autoplay":false},
    {"id":"photo-desc","type":"image_text","imagePosition":"left","title":"Imprimez vos plus beaux souvenirs","text":"Depuis votre smartphone, clé USB ou carte mémoire, faites tirer vos photos en quelques minutes. Photos d''identité aux normes, tirages classiques, agrandissements, cadres et albums personnalisés. Qualité photo professionnelle, papier brillant ou mat."},
    {"id":"photo-feat","type":"icon_features","columns":4,"settings":{"anchor":"services","padding":"lg"},"features":[{"icon":"User","title":"Photos d''identité","description":"Aux normes ANTS, prêtes en 5 minutes. Passeport, carte d''identité, permis."},{"icon":"Image","title":"Tirages classiques","description":"Du 10x15 au 30x45, papier photo brillant ou mat de qualité."},{"icon":"BookOpen","title":"Albums photo","description":"Albums personnalisés avec vos photos, idéal pour offrir."},{"icon":"Frame","title":"Cadres & supports","description":"Cadres photo, toiles canvas, plaques alu pour vos tirages."}]},
    {"id":"photo-faq","type":"faq","settings":{"padding":"lg"},"questions":[{"q":"Les photos d''identité sont-elles aux normes ?","a":"Oui, nos photos d''identité respectent les normes ANTS pour les passeports, cartes d''identité et permis de conduire."},{"q":"Peut-on tirer des photos depuis un smartphone ?","a":"Oui ! Transférez vos photos par email, AirDrop ou clé USB. Nous pouvons aussi les récupérer depuis votre téléphone en magasin."},{"q":"Quels formats de tirage proposez-vous ?","a":"Du 10x15 (standard) au 30x45 (poster), en passant par le 13x18, 15x21 et 20x30."}]},
    {"id":"photo-cta","type":"cta","settings":{"padding":"lg"},"title":"Des photos à tirer ?","description":"Passez en magasin avec votre support ou envoyez vos fichiers par email.","button":"Nous contacter","link":"/contact"}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- 8. SOUS-PAGE : Plaques & Clés
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.static_pages (
  id, slug, title, meta_title, meta_description, h1, layout, status, published_at,
  schema_type, seo_score, json_ld, content
) VALUES (
  gen_random_uuid(),
  'plaques-cles',
  'Plaques & Clés',
  'Plaques d''Immatriculation & Duplication de Clés à Chaumont | Papeterie Reine & Fils',
  'Plaques d''immatriculation homologuées et duplication de clés à Chaumont. Auto, moto, remorque. Service rapide sans rendez-vous.',
  'Plaques d''Immatriculation & Clés',
  'full-width',
  'published',
  NOW(),
  'Service',
  76,
  '{"@context":"https://schema.org","@type":"Service","name":"Plaques d''Immatriculation & Clés","provider":{"@type":"LocalBusiness","name":"Papeterie Reine & Fils","address":{"@type":"PostalAddress","addressLocality":"Chaumont","postalCode":"52000"}},"description":"Plaques d''immatriculation homologuées et duplication de clés à Chaumont."}',
  '[
    {"id":"plaq-hero","type":"hero","slides":[{"title":"Plaques & Clés","subtitle":"Plaques d''immatriculation homologuées, duplication de clés — service express","buttonText":"En magasin","buttonLink":"/contact"}],"autoplay":false},
    {"id":"plaq-desc","type":"image_text","imagePosition":"right","title":"Plaques et clés, service express","text":"Besoin d''une plaque d''immatriculation ? Nous fabriquons sur place des plaques homologuées pour auto, moto et remorque, avec le département de votre choix. Nous dupliquons également vos clés plates, à gorge et certaines clés de sécurité."},
    {"id":"plaq-grid","type":"service_grid","columns":2,"displayMode":"icon","settings":{"padding":"lg"},"services":[{"icon":"Car","title":"Plaques d''immatriculation","description":"Plaques auto, moto et remorque homologuées, tous départements. Fabrication en 10 minutes.","features":["Auto 520x110mm","Moto 210x130mm","Remorque","Tous départements"]},{"icon":"Key","title":"Duplication de clés","description":"Reproduction de clés plates, à gorge et certaines clés de sécurité. Service rapide.","features":["Clés plates","Clés à gorge","Clés sécurisées","Express 5 min"]}]},
    {"id":"plaq-faq","type":"faq","settings":{"padding":"lg"},"questions":[{"q":"Vos plaques sont-elles homologuées ?","a":"Oui, toutes nos plaques sont conformes à la réglementation et au format SIV (Système d''Immatriculation des Véhicules)."},{"q":"Quels documents faut-il pour une plaque ?","a":"Munissez-vous de votre carte grise (certificat d''immatriculation). La plaque est fabriquée en 10 minutes."},{"q":"Dupliquez-vous toutes les clés ?","a":"Nous dupliquons la majorité des clés plates et à gorge. Pour les clés de sécurité ou les clés de voiture à transpondeur, contactez-nous pour vérifier la compatibilité."}]},
    {"id":"plaq-cta","type":"cta","settings":{"padding":"lg"},"title":"Besoin d''une plaque ou d''un double de clé ?","description":"Passez en magasin, c''est prêt en quelques minutes.","button":"Nous trouver","link":"/contact"}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- 9. SOUS-PAGE : Solutions Pro & B2B
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.static_pages (
  id, slug, title, meta_title, meta_description, h1, layout, status, published_at,
  schema_type, seo_score, json_ld, content
) VALUES (
  gen_random_uuid(),
  'solutions-pro',
  'Solutions Pro & B2B',
  'Services Pro & B2B — Fournitures et Impression pour Entreprises | Papeterie Reine & Fils Chaumont',
  'Solutions professionnelles à Chaumont : fournitures de bureau, impression en volume, compte entreprise, livraison, devis personnalisés. Votre partenaire papeterie B2B.',
  'Solutions Pro & B2B',
  'full-width',
  'published',
  NOW(),
  'Service',
  78,
  '{"@context":"https://schema.org","@type":"Service","name":"Solutions Pro & B2B","provider":{"@type":"LocalBusiness","name":"Papeterie Reine & Fils","address":{"@type":"PostalAddress","addressLocality":"Chaumont","postalCode":"52000"}},"description":"Services dédiés aux entreprises : fournitures, impression, livraison à Chaumont."}',
  '[
    {"id":"pro-hero","type":"hero","slides":[{"title":"Solutions Pro & B2B","subtitle":"Fournitures, impression, services dédiés — votre partenaire papeterie pour les pros","buttonText":"Demander un devis","buttonLink":"/contact"}],"autoplay":false},
    {"id":"pro-desc","type":"image_text","imagePosition":"left","title":"Votre partenaire papeterie pour les professionnels","text":"Entreprises, associations, collectivités : bénéficiez de tarifs négociés, d''un compte professionnel avec facturation mensuelle, et d''un service de livraison. Fournitures de bureau, consommables, impression en volume — nous sommes votre interlocuteur unique pour tous vos besoins."},
    {"id":"pro-feat","type":"icon_features","columns":4,"settings":{"padding":"lg"},"features":[{"icon":"Receipt","title":"Facturation mensuelle","description":"Compte pro avec règlement à 30 jours, factures détaillées."},{"icon":"Truck","title":"Livraison","description":"Livraison gratuite à Chaumont et environs dès 50€ HT."},{"icon":"BadgePercent","title":"Tarifs négociés","description":"Remises permanentes selon votre volume d''achats."},{"icon":"Headphones","title":"Interlocuteur dédié","description":"Un conseiller attitré pour suivre vos commandes."}]},
    {"id":"pro-pricing","type":"pricing_table","settings":{"padding":"lg"},"plans":[{"name":"Essentiel","price":"Gratuit","features":["Compte professionnel","Facturation mensuelle","Tarifs catalogue","Commande par email"],"buttonText":"Ouvrir un compte","buttonLink":"/contact"},{"name":"Business","price":"Sur mesure","features":["Tout Essentiel +","Remises négociées","Livraison gratuite dès 50€","Interlocuteur dédié"],"highlighted":true,"buttonText":"Demander un devis","buttonLink":"/contact"},{"name":"Collectivité","price":"Sur mesure","features":["Tout Business +","Marchés publics","Bons de commande","Facturation CHORUS Pro"],"buttonText":"Nous contacter","buttonLink":"/contact"}]},
    {"id":"pro-faq","type":"faq","settings":{"padding":"lg"},"questions":[{"q":"Comment ouvrir un compte professionnel ?","a":"Contactez-nous par téléphone ou email avec votre SIRET. Nous créons votre compte en 24h et vous envoyons vos identifiants."},{"q":"Livrez-vous en dehors de Chaumont ?","a":"Oui, nous livrons dans toute la Haute-Marne. Les frais de livraison dépendent de la distance et du montant de la commande."},{"q":"Acceptez-vous les bons de commande ?","a":"Oui, nous acceptons les bons de commande pour les collectivités et les entreprises ayant un compte validé."}]},
    {"id":"pro-cta","type":"cta","settings":{"padding":"lg"},"title":"Professionnel ? Parlons de vos besoins","description":"Devis gratuit et personnalisé sous 24h.","button":"Demander un devis","link":"/contact"}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;
