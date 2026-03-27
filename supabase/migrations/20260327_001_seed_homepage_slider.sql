-- Seed homepage slider with 4 initial slides
-- Administrable via Pages & Builder admin

INSERT INTO static_pages (slug, title, meta_title, meta_description, h1, status, layout, content, published_at)
VALUES (
  'homepage',
  'Accueil',
  'Ma Papeterie | Fournitures de bureau & scolaires',
  'Ma Papeterie : 45 000+ fournitures de bureau et scolaires. Livraison express, devis pro en 1h.',
  'Accueil',
  'published',
  'full-width',
  '[
    {
      "id": "homepage-hero-slider",
      "type": "hero",
      "autoplay": true,
      "interval": 5000,
      "slides": [
        {
          "title": "Fête des Mères — Offrez l''élégance",
          "subtitle": "Découvrez notre sélection de stylos Belius : design raffiné, écriture fluide, coffret cadeau inclus. Le cadeau parfait pour une maman qui a du style.",
          "buttonText": "Découvrir Belius →",
          "buttonLink": "/catalogue?search=belius"
        },
        {
          "title": "Votre tampon pro en 24h chrono",
          "subtitle": "Tampons encreurs personnalisés pour entreprises, artisans et professions libérales. Conception sur mesure, livraison express à Chaumont et alentours.",
          "buttonText": "Commander un tampon →",
          "buttonLink": "/tampon-professionnel-chaumont"
        },
        {
          "title": "Impression photos express",
          "subtitle": "Vos photos imprimées en 10 minutes. Tirages classiques, formats spéciaux, photos d''identité. Service express sans rendez-vous en boutique.",
          "buttonText": "Imprimer mes photos →",
          "buttonLink": "/photos-express-chaumont"
        },
        {
          "title": "Examens : révisez malin avec Oxford",
          "subtitle": "Les fiches Révision 2.0 d''Oxford : flashcards connectées, système SCRIBZEE® pour scanner et réviser sur mobile. Brevet, Bac, concours — soyez prêts.",
          "buttonText": "Voir les fiches Oxford →",
          "buttonLink": "/catalogue?search=oxford+revision"
        }
      ]
    }
  ]'::jsonb,
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  status = 'published',
  published_at = COALESCE(static_pages.published_at, NOW()),
  updated_at = NOW();
