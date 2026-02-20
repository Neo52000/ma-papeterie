
# Multi-fournisseurs → 1 fiche produit + Prix public PVP + Stock mutualisé + Backoffice Offres

## Analyse de l'existant

### Ce qui existe déjà
- Table `supplier_products` : liée aux fournisseurs par UUID, avec `stock_quantity`, `lead_time_days`, `priority_rank`, mais **pas** de `pvp_ttc`, pas de `tax_breakdown`, pas d'enum `ALKOR/COMLANDI/SOFT`
- Table `liderpapel_pricing_coefficients` (family + subfamily + coefficient) — vide pour l'instant, sans `is_active`
- Fournisseurs en base : `ALKOR (31f000af)`, `Soft Carrier (5ca03e21)`, `CS Group/Comlandi (450c421b)` — les UUIDs sont connus
- Table `products` : possède `family`, `subfamily`, `price_ht`, `price_ttc`, `tva_rate`, `eco_tax` — mais **pas** de `public_price_ttc`, `public_price_source`, `is_available`, `available_qty_total`
- Fonctions SQL : seul `find_products_by_refs` existe, aucune des fonctions de rollup
- RLS `products` : SELECT public déjà en place, admin ALL déjà en place

### Ce qui manque
- Table `supplier_offers` (à créer)
- Colonnes rollup dans `products` (à ajouter)
- Fonctions SQL de calcul prix et disponibilité (à créer)
- Page admin `AdminProductOffers.tsx` + composants
- Hooks `useSupplierOffers`, `useRecomputeRollups`

### Décision d'architecture importante
La table `supplier_offers` va coexister avec `supplier_products`. Elle est **orientée données d'import brutes** (PVP, taxes, délais, packaging) depuis les 3 sources ALKOR/COMLANDI/SOFT, alors que `supplier_products` reste la table de pilotage achat. On ne supprime rien.

---

## Phase A — Migrations SQL (2 fichiers)

### Fichier 1 : `create_supplier_offers_and_rollup_columns.sql`

**A1 — Colonnes rollup dans `products`**
```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS public_price_ttc numeric,
  ADD COLUMN IF NOT EXISTS public_price_source text 
    CHECK (public_price_source IN ('PVP_ALKOR','PVP_COMLANDI','PVP_SOFT','COEF')),
  ADD COLUMN IF NOT EXISTS public_price_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_qty_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability_updated_at timestamptz;
```

**A2 — Table `supplier_offers`**
```sql
CREATE TABLE public.supplier_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier text NOT NULL CHECK (supplier IN ('ALKOR','COMLANDI','SOFT')),
  supplier_product_id text NOT NULL,
  pvp_ttc numeric,
  purchase_price_ht numeric,
  vat_rate numeric DEFAULT 20,
  tax_breakdown jsonb DEFAULT '{}',
  stock_qty integer DEFAULT 0,
  delivery_delay_days integer,
  min_qty integer DEFAULT 1,
  packaging jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (supplier, supplier_product_id)
);

CREATE INDEX idx_supplier_offers_product_id ON public.supplier_offers(product_id);
CREATE INDEX idx_supplier_offers_supplier ON public.supplier_offers(supplier);
CREATE INDEX idx_supplier_offers_active ON public.supplier_offers(is_active) WHERE is_active = true;

ALTER TABLE public.supplier_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supplier_offers"
ON public.supplier_offers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
```

**A3 — Ajout `is_active` à `liderpapel_pricing_coefficients`**
```sql
ALTER TABLE public.liderpapel_pricing_coefficients
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
```

### Fichier 2 : `create_rollup_functions.sql`

**Vue priorité fournisseur**
```sql
CREATE OR REPLACE VIEW public.v_supplier_offer_priority AS
SELECT *,
  CASE supplier
    WHEN 'ALKOR'    THEN 1
    WHEN 'COMLANDI' THEN 2
    WHEN 'SOFT'     THEN 3
  END AS priority_rank
FROM public.supplier_offers
WHERE is_active = true;
```

**Fonction `get_pricing_coefficient(family, subfamily)`**
```sql
CREATE OR REPLACE FUNCTION public.get_pricing_coefficient(p_family text, p_subfamily text DEFAULT '')
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Match exact famille + sous-famille
    (SELECT coefficient FROM liderpapel_pricing_coefficients
     WHERE family = p_family AND subfamily = p_subfamily AND is_active = true LIMIT 1),
    -- Fallback famille seule
    (SELECT coefficient FROM liderpapel_pricing_coefficients
     WHERE family = p_family AND (subfamily IS NULL OR subfamily = '') AND is_active = true LIMIT 1),
    -- Fallback global
    2.0
  );
$$;
```

**Fonction `select_reference_offer_for_pricing(product_id)`**
```sql
CREATE OR REPLACE FUNCTION public.select_reference_offer_for_pricing(p_product_id uuid)
RETURNS public.supplier_offers
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- 1. Offre active avec stock > 0, priorité ALKOR > COMLANDI > SOFT
  SELECT * FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true AND stock_qty > 0
  ORDER BY CASE supplier WHEN 'ALKOR' THEN 1 WHEN 'COMLANDI' THEN 2 WHEN 'SOFT' THEN 3 END
  LIMIT 1
  -- 2. Sinon, offre active sans stock (au moins une référence connue)
  UNION ALL
  SELECT * FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true AND stock_qty = 0
  ORDER BY CASE supplier WHEN 'ALKOR' THEN 1 WHEN 'COMLANDI' THEN 2 WHEN 'SOFT' THEN 3 END
  LIMIT 1
  LIMIT 1;
$$;
```

**Fonction `compute_coef_public_price_ttc(product_id)`**
```sql
CREATE OR REPLACE FUNCTION public.compute_coef_public_price_ttc(p_product_id uuid)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer public.supplier_offers;
  v_coef numeric;
  v_taxes numeric := 0;
  v_tax_key text;
  v_tax_val numeric;
  v_price_ht numeric;
  v_vat_rate numeric;
BEGIN
  v_offer := public.select_reference_offer_for_pricing(p_product_id);
  IF v_offer IS NULL OR v_offer.purchase_price_ht IS NULL THEN RETURN NULL; END IF;

  SELECT public.get_pricing_coefficient(p.family, p.subfamily)
  INTO v_coef FROM public.products p WHERE p.id = p_product_id;

  v_price_ht := v_offer.purchase_price_ht * v_coef;
  v_vat_rate := COALESCE(v_offer.vat_rate, 20) / 100.0;

  -- Somme des éco-taxes depuis tax_breakdown jsonb
  IF v_offer.tax_breakdown IS NOT NULL THEN
    FOR v_tax_key, v_tax_val IN SELECT key, value::numeric FROM jsonb_each_text(v_offer.tax_breakdown)
    LOOP
      v_taxes := v_taxes + COALESCE(v_tax_val, 0);
    END LOOP;
  END IF;

  RETURN ROUND(v_price_ht * (1 + v_vat_rate) + v_taxes, 2);
END;
$$;
```

**Fonction principale `recompute_product_rollups(product_id)` — appelée manuellement, jamais en trigger**
```sql
CREATE OR REPLACE FUNCTION public.recompute_product_rollups(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_stock integer := 0;
  v_is_available boolean := false;
  v_public_price numeric := NULL;
  v_price_source text := NULL;
  v_offer public.supplier_offers;
BEGIN
  -- Stock mutualisé
  SELECT COALESCE(SUM(stock_qty), 0), (SUM(stock_qty) > 0)
  INTO v_total_stock, v_is_available
  FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true;

  -- PVP par priorité stricte ALKOR > COMLANDI > SOFT
  SELECT pvp_ttc, supplier INTO v_public_price, v_price_source
  FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true AND pvp_ttc IS NOT NULL
  ORDER BY CASE supplier WHEN 'ALKOR' THEN 1 WHEN 'COMLANDI' THEN 2 WHEN 'SOFT' THEN 3 END
  LIMIT 1;

  IF v_public_price IS NOT NULL THEN
    v_price_source := 'PVP_' || v_price_source;
  ELSE
    -- Fallback COEF
    v_public_price := public.compute_coef_public_price_ttc(p_product_id);
    IF v_public_price IS NOT NULL THEN v_price_source := 'COEF'; END IF;
  END IF;

  -- Mise à jour products
  UPDATE public.products SET
    public_price_ttc = v_public_price,
    public_price_source = v_price_source,
    public_price_updated_at = now(),
    is_available = v_is_available,
    available_qty_total = v_total_stock,
    availability_updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'public_price_ttc', v_public_price,
    'public_price_source', v_price_source,
    'is_available', v_is_available,
    'available_qty_total', v_total_stock
  );
END;
$$;
```

**RPC exposée admin uniquement**
```sql
CREATE OR REPLACE FUNCTION public.admin_recompute_product_rollups(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;
  RETURN public.recompute_product_rollups(p_product_id);
END;
$$;
```

---

## Phase B — Fichiers TypeScript à créer

### Hook `src/hooks/useSupplierOffers.ts`
```typescript
export interface SupplierOffer {
  id: string;
  product_id: string;
  supplier: 'ALKOR' | 'COMLANDI' | 'SOFT';
  supplier_product_id: string;
  pvp_ttc: number | null;
  purchase_price_ht: number | null;
  vat_rate: number | null;
  tax_breakdown: Record<string, number> | null;
  stock_qty: number;
  delivery_delay_days: number | null;
  min_qty: number;
  packaging: Record<string, any> | null;
  is_active: boolean;
  last_seen_at: string;
  updated_at: string;
}
```
- `useSupplierOffers(productId)` — fetch offres par produit
- `toggleOfferActive(offerId, bool)` — met à jour `is_active` et appelle recompute
- Utilise `useQuery` de TanStack Query

### Hook `src/hooks/useRecomputeRollups.ts`
- `useMutation` qui appelle `supabase.rpc('admin_recompute_product_rollups', { p_product_id })`
- `onSuccess` : invalide le query `supplier-offers` et `product-rollup`
- Toast succès/erreur

### Page `src/pages/AdminProductOffers.tsx`
Route : `/admin/products/:id/offers`

Structure :
- `useParams()` pour récupérer l'id produit
- Requête directe Supabase : `products.select('id, name, public_price_ttc, public_price_source, public_price_updated_at, is_available, available_qty_total, family, subfamily').eq('id', id).single()`
- `useSupplierOffers(id)` pour les offres
- `useRecomputeRollups()` pour le bouton recalcul

**Bloc 1 — `ProductRollupHeader`** : nom produit, badge disponibilité vert/rouge, prix public TTC + badge source (PVP_ALKOR / COEF), stock mutualisé, date màj

**Bloc 2 — `OffersAlerts`** : alertes conditionnelles (COEF orange, prix null rouge, rupture info)

**Bloc 3 — `OffersTable`** : tableau par supplier, badge "Prioritaire" sur ALKOR, toggle `is_active`, colonnes PVP/achat/taxes/stock/délai

### Composant `src/components/admin/OffersTable.tsx`
- Reçoit `offers: SupplierOffer[]` + `onToggle(id, bool)` + `onRecompute()`
- Trie par `supplier` (ALKOR d'abord)
- Badge "Prioritaire" sur ALKOR
- Colonne taxes : affiche `D3E: 0,42€; COP: 0€` depuis `tax_breakdown`
- Colonne PVP : "—" si null
- Toggle switch sur `is_active`
- Bouton "Recalculer rollups" en bas

### Composant `src/components/admin/ProductRollupHeader.tsx`
- Props : données produit rollup
- Badge vert "Disponible" / rouge "Indisponible"
- Badge source prix : `PVP_ALKOR` → vert, `COEF` → orange, null → rouge

### Composant `src/components/admin/OffersAlerts.tsx`
- Props : `publicPriceSource`, `publicPriceTtc`, `isAvailable`, `hasOffers`
- Alerte orange si `COEF`
- Alerte rouge si `public_price_ttc IS NULL`
- Info bleue si indisponible avec offres existantes

---

## Phase C — Modifications de fichiers existants

### `src/App.tsx`
Ajouter import `AdminProductOffers` et route :
```tsx
import AdminProductOffers from "./pages/AdminProductOffers";
// ...
<Route path="/admin/products/:id/offers" element={<AdminProductOffers />} />
```

### `src/components/admin/AdminSidebar.tsx`
Aucun ajout nécessaire (la page est accessible depuis les cartes produits dans AdminProducts)

### `src/pages/AdminProducts.tsx`
Dans chaque carte produit, ajouter un bouton "Offres fournisseurs" à côté du bouton "Voir fiche" :
```tsx
<Link to={`/admin/products/${product.id}/offers`}>
  <Truck className="h-4 w-4" />
</Link>
```

---

## Ordre d'exécution

| # | Action | Fichier |
|---|--------|---------|
| 1 | Migration SQL tables + colonnes | `supabase/migrations/..._supplier_offers.sql` |
| 2 | Migration SQL fonctions rollup | `supabase/migrations/..._rollup_functions.sql` |
| 3 | Hook useSupplierOffers | `src/hooks/useSupplierOffers.ts` |
| 4 | Hook useRecomputeRollups | `src/hooks/useRecomputeRollups.ts` |
| 5 | Composant OffersTable | `src/components/admin/OffersTable.tsx` |
| 6 | Composant ProductRollupHeader | `src/components/admin/ProductRollupHeader.tsx` |
| 7 | Composant OffersAlerts | `src/components/admin/OffersAlerts.tsx` |
| 8 | Page AdminProductOffers | `src/pages/AdminProductOffers.tsx` |
| 9 | Route dans App.tsx | `src/App.tsx` |
| 10 | Lien dans AdminProducts.tsx | `src/pages/AdminProducts.tsx` |

## Ce qui n'est PAS dans ce plan

- Modification des edge functions d'import (ALKOR/COMLANDI/SOFT) pour alimenter `supplier_offers` automatiquement — c'est un ticket séparé (T3.1 bis)
- Batch recompute de tous les produits — prévu via bouton "Recalculer tout" en phase suivante
- `supplier_offers` ne remplace PAS `supplier_products` — les deux coexistent
