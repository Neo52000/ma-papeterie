-- Add pricing_detail blocks to service pages: impression-copies and tirage-photos
-- Also adds a shipping pricing block to both pages

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Page impression-copies : Reprographie tarifs + suppléments
-- ══════════════════════════════════════════════════════════════════════════════
UPDATE public.static_pages
SET content = content || '[
  {
    "id": "imp-pricing-detail",
    "type": "pricing_detail",
    "title": "Grille Tarifaire Reprographie",
    "settings": {"anchor": "grille-tarifaire", "padding": "lg"},
    "tables": [
      {
        "title": "Tarifs de base",
        "rows": [
          {"label": "A4 — Noir & Blanc", "price_ht": 0.10, "display": "", "suffix": "/page"},
          {"label": "A4 — Couleur", "price_ht": 0.50, "display": "", "suffix": "/page"},
          {"label": "A3 — Noir & Blanc", "price_ht": 0.20, "display": "", "suffix": "/page"},
          {"label": "A3 — Couleur", "price_ht": 1.00, "display": "", "suffix": "/page"}
        ]
      },
      {
        "title": "Suppléments et finitions",
        "rows": [
          {"label": "Recto-verso", "price_ht": null, "display": "+50% du prix unitaire"},
          {"label": "Papier 160g", "price_ht": 0.05, "display": "", "suffix": "/feuille"},
          {"label": "Papier 250g", "price_ht": 0.10, "display": "", "suffix": "/feuille"},
          {"label": "Reliure spirale", "price_ht": 2.50, "display": ""},
          {"label": "Reliure thermocollée", "price_ht": 4.00, "display": ""},
          {"label": "Agrafage", "price_ht": 0.50, "display": ""},
          {"label": "Plastification A4", "price_ht": 1.50, "display": ""},
          {"label": "Plastification A3", "price_ht": 2.50, "display": ""}
        ]
      }
    ]
  }
]'::jsonb
WHERE slug = 'impression-copies';


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Page tirage-photos : Développement photo tarifs + suppléments
-- ══════════════════════════════════════════════════════════════════════════════
UPDATE public.static_pages
SET content = content || '[
  {
    "id": "photo-pricing-detail",
    "type": "pricing_detail",
    "title": "Grille Tarifaire Développement Photo",
    "settings": {"anchor": "grille-tarifaire", "padding": "lg"},
    "tables": [
      {
        "title": "Tirages photo",
        "rows": [
          {"label": "10 x 15 cm", "price_ht": 0.15, "display": ""},
          {"label": "13 x 18 cm", "price_ht": 0.35, "display": ""},
          {"label": "15 x 20 cm", "price_ht": 0.50, "display": ""},
          {"label": "20 x 30 cm", "price_ht": 2.00, "display": ""},
          {"label": "30 x 45 cm", "price_ht": 5.00, "display": ""},
          {"label": "40 x 60 cm", "price_ht": 12.00, "display": ""},
          {"label": "50 x 75 cm", "price_ht": 20.00, "display": ""},
          {"label": "60 x 90 cm", "price_ht": 30.00, "display": ""}
        ]
      },
      {
        "title": "Suppléments photo",
        "rows": [
          {"label": "Papier mat (vs brillant standard)", "price_ht": null, "display": "+0.00€"},
          {"label": "Papier satin", "price_ht": null, "display": "+10%"},
          {"label": "Papier fine art", "price_ht": null, "display": "+30%"},
          {"label": "Marge blanche", "price_ht": null, "display": "+0.00€"}
        ]
      }
    ]
  }
]'::jsonb
WHERE slug = 'tirage-photos';


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Frais de livraison sur les deux pages de service
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  shipping_block jsonb := '[
    {
      "id": "shipping-pricing-detail",
      "type": "pricing_detail",
      "title": "Frais de Livraison",
      "settings": {"padding": "lg"},
      "tables": [
        {
          "title": "Tarifs par poids",
          "rows": [
            {"label": "< 250g (Lettre suivie)", "price_ht": 3.50, "display": ""},
            {"label": "250g – 1kg (Colissimo)", "price_ht": 5.50, "display": ""},
            {"label": "1kg – 3kg", "price_ht": 7.50, "display": ""},
            {"label": "> 3kg", "price_ht": 9.50, "display": ""},
            {"label": "Retrait en boutique", "price_ht": null, "display": "Gratuit", "highlight": true}
          ]
        }
      ]
    }
  ]'::jsonb;
BEGIN
  UPDATE public.static_pages
  SET content = content || shipping_block
  WHERE slug IN ('impression-copies', 'tirage-photos');
END $$;
