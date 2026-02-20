
# Compléter le plan : Imports → supplier_offers + batch recompute + coexistence supplier_products

## Analyse de l'état actuel

### Ce qui est déjà en place
- Table `supplier_offers` : créée, RLS admin-only, index OK
- Colonnes rollup sur `products` : `public_price_ttc`, `public_price_source`, `is_available`, `available_qty_total`
- Fonctions SQL : `recompute_product_rollups`, `admin_recompute_product_rollups`, `compute_coef_public_price_ttc`, `get_pricing_coefficient`
- Page admin `AdminProductOffers.tsx` + composants + hooks `useSupplierOffers`, `useRecomputeRollups`
- `import-comlandi` : upsert `supplier_products` ✅ — mais **aucun upsert `supplier_offers`** ❌
- `import-alkor` : upsert `products` uniquement — **aucun `supplier_offers`**, pas de prix (catalogue seul) ❌
- `import-softcarrier` : upsert `products` + `supplier_price_tiers` — **aucun `supplier_offers`** ❌
- `fetch-liderpapel-sftp` (handler Liderpapel) : upsert `supplier_products` ✅ — **aucun `supplier_offers`** ❌

### Ce qui manque
1. **Upsert `supplier_offers`** dans les 3 imports (COMLANDI, SOFT-preislis/tarifsb2b, ALKOR-enrich)
2. **Désactivation des offres fantômes** : `is_active=false` pour les offres non vues depuis N jours
3. **RPC `admin_recompute_all_rollups`** pour le batch global
4. **Page admin `AdminAutomations.tsx`** ou section dédiée avec bouton "Recalculer tout" + progression
5. **Lien sidebar** vers la page batch recompute

### Architecture coexistence confirmée
```
supplier_products : mapping stable fournisseur → product_id (identité, référence, famille, priorité achat)
supplier_offers   : données dynamiques par import (prix, stock, taxes, délais, PVP) → rollup → products
```
Les deux tables coexistent. `supplier_products` reste la table de pilotage achat. `supplier_offers` est la source de vérité prix/stock pour le calcul du prix public.

---

## Détail de chaque modification

### 1. Migration SQL — RPC batch recompute

Nouveau fichier `supabase/migrations/[timestamp]_batch_recompute_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION public.admin_recompute_all_rollups(
  p_limit int DEFAULT 500,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_processed int := 0;
  v_errors int := 0;
  v_next_offset int;
  v_total bigint;
BEGIN
  -- Sécurité : admin uniquement
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.products WHERE is_active = true;

  FOR v_id IN
    SELECT id FROM public.products
    WHERE is_active = true
    ORDER BY id
    LIMIT p_limit OFFSET p_offset
  LOOP
    BEGIN
      PERFORM public.recompute_product_rollups(v_id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  v_next_offset := p_offset + p_limit;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'errors', v_errors,
    'next_offset', v_next_offset,
    'total', v_total,
    'done', (v_next_offset >= v_total)
  );
END;
$$;
```

---

### 2. `supabase/functions/import-comlandi/index.ts` — Ajout upsert `supplier_offers`

**Dans le handler principal (source=comlandi)**, après le bloc `supplier_products` :

```typescript
// Collect supplier_offers for batch upsert
const supplierOffersBatch: any[] = [];
// ... dans la boucle, après savedProductId résolu :
if (savedProductId) {
  const pvp = parseNum(row.pvp_conseille) || null;
  const taxBreakdown: Record<string, number> = {};
  if (parseNum(row.taxe_d3e) > 0) taxBreakdown.D3E = parseNum(row.taxe_d3e);
  if (parseNum(row.taxe_cop) > 0) taxBreakdown.COP = parseNum(row.taxe_cop);
  if (parseNum(row.taxe_mob) > 0) taxBreakdown.MOB = parseNum(row.taxe_mob);
  if (parseNum(row.taxe_scm) > 0) taxBreakdown.SCM = parseNum(row.taxe_scm);
  if (parseNum(row.taxe_sod) > 0) taxBreakdown.SOD = parseNum(row.taxe_sod);

  supplierOffersBatch.push({
    product_id: savedProductId,
    supplier: 'COMLANDI',
    supplier_product_id: ref || ean || savedProductId,
    purchase_price_ht: prixHT > 0 ? prixHT : null,
    pvp_ttc: pvp,
    vat_rate: tvaRate,
    tax_breakdown: taxBreakdown,
    stock_qty: 0, // Comlandi CSV ne fourni pas de stock séparément
    is_active: true,
    last_seen_at: new Date().toISOString(),
  });
}
```

**Flush des offers** avant le log, avec gestion du `is_active=false` des fantômes :

```typescript
// Upsert offers
await flushBatch(supabase, 'supplier_offers', supplierOffersBatch, 'supplier,supplier_product_id');

// Désactiver les offres COMLANDI non vues depuis 3 jours (offres fantômes)
try {
  await supabase.from('supplier_offers')
    .update({ is_active: false })
    .eq('supplier', 'COMLANDI')
    .lt('last_seen_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());
} catch (_) { /* ignore */ }

// Batch recompute des produits touchés
const uniqueProductIds = [...new Set(supplierOffersBatch.map(o => o.product_id))];
for (let i = 0; i < uniqueProductIds.length; i += 100) {
  const chunk = uniqueProductIds.slice(i, i + 100);
  for (const pid of chunk) {
    try {
      await supabase.rpc('recompute_product_rollups', { p_product_id: pid });
    } catch (_) { /* non-bloquant */ }
  }
}
```

**Idem pour le handler `handleLiderpapel` (source=liderpapel)** — même logique, `supplier: 'COMLANDI'` (CS Group) :

```typescript
supplierOffersBatch.push({
  product_id: savedProductId,
  supplier: 'COMLANDI',
  supplier_product_id: ref || ean || savedProductId,
  purchase_price_ht: costPrice > 0 ? costPrice : null,
  pvp_ttc: suggestedPrice > 0 ? suggestedPrice : null,
  vat_rate: tvaRate,
  tax_breakdown: { D3E: parseNum(row.taxe_d3e), COP: parseNum(row.taxe_cop), MOB: parseNum(row.taxe_mob) },
  stock_qty: Math.floor(parseNum(row.stock_quantity)) || 0,
  delivery_delay_days: null,
  min_qty: 1,
  is_active: true,
  last_seen_at: new Date().toISOString(),
});
```

---

### 3. `supabase/functions/import-alkor/index.ts` — Ajout upsert `supplier_offers`

ALKOR est un catalogue produit **sans prix**. L'upsert dans `supplier_offers` est donc partiel : on crée une offre `ALKOR` avec `purchase_price_ht=null`, `pvp_ttc=null`, mais avec `supplier_product_id=ref_art` et `is_active=isActive`.

L'objectif est de **marquer la présence ALKOR** pour que le rollup sache qu'ALKOR a la priorité sur ce produit dès qu'un fichier prix ALKOR sera importé ultérieurement.

```typescript
// Après chaque upsert product réussi (savedProductId connu)
const alkorOffersBatch: any[] = [];
// ... dans la boucle :
if (savedProductId && ref) {
  alkorOffersBatch.push({
    product_id: savedProductId,
    supplier: 'ALKOR',
    supplier_product_id: ref,
    purchase_price_ht: null,
    pvp_ttc: null,
    vat_rate: 20,
    tax_breakdown: {},
    stock_qty: 0,
    is_active: isActive,
    last_seen_at: new Date().toISOString(),
  });
}

// Flush à la fin
await flushBatch(supabase, 'supplier_offers', alkorOffersBatch, 'supplier,supplier_product_id');

// Désactiver les offres ALKOR non vues (cycle_vie != actif)
try {
  await supabase.from('supplier_offers')
    .update({ is_active: false })
    .eq('supplier', 'ALKOR')
    .lt('last_seen_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());
} catch (_) {}
```

---

### 4. `supabase/functions/import-softcarrier/index.ts` — Ajout upsert `supplier_offers`

**Case `preislis`** : les données de prix sont disponibles. Upsert `supplier_offers` avec `supplier='SOFT'` après l'upsert `products` :

```typescript
// Récupération softcarrier supplier ID (une fois, avant la boucle)
let softSupplierId: string | null = null;
const { data: softSupp } = await supabase.from('suppliers').select('id').ilike('name', '%soft%').limit(1).maybeSingle();
if (softSupp) softSupplierId = softSupp.id;

// Dans la boucle preislis, après productId résolu :
const softOffersBatch: any[] = [];
softOffersBatch.push({
  product_id: productId,
  supplier: 'SOFT',
  supplier_product_id: ref,
  purchase_price_ht: priceHt > 0 ? priceHt : null,
  pvp_ttc: null, // PVP vient de TarifsB2B
  vat_rate: vatCode === 2 ? 5.5 : 20,
  tax_breakdown: {},
  stock_qty: parseInt(cols[36]) || 0,
  delivery_delay_days: null,
  min_qty: parseInt(cols[22]) || 1, // Col W = emballage unitaire
  is_active: cols[34]?.trim() !== '1', // is_end_of_life = false
  last_seen_at: new Date().toISOString(),
});

// Flush en batch à la fin du case preislis
await flushBatch(supabase, 'supplier_offers', softOffersBatch, 'supplier,supplier_product_id');
```

**Case `tarifsb2b`** : PVP est disponible ici. Mettre à jour `supplier_offers` existant :

```typescript
// Après update product, si pvp disponible :
if (colPvp >= 0 && pvpVal > 0) {
  const taxBD: Record<string, number> = {};
  if (colTaxeCop >= 0) taxBD.COP = parseDecimal(cols[colTaxeCop]) || 0;
  if (colTaxeD3e >= 0) taxBD.D3E = parseDecimal(cols[colTaxeD3e]) || 0;
  
  await supabase.from('supplier_offers')
    .update({
      pvp_ttc: pvpVal,
      tax_breakdown: taxBD,
      last_seen_at: new Date().toISOString(),
      is_active: true,
    })
    .eq('supplier', 'SOFT')
    .eq('product_id', prod.id); // via product_id car ref_softcarrier = supplier_product_id
}
```

**Case `lagerbestand`** (stock temps réel) : mettre à jour `stock_qty` dans `supplier_offers` :

```typescript
// Dans la boucle lagerbestand :
// Après insert dans supplier_stock_snapshots, mettre à jour supplier_offers
await supabase.from('supplier_offers')
  .update({ stock_qty: qty_available, last_seen_at: fetchedAt })
  .eq('supplier', 'SOFT')
  .eq('supplier_product_id', ref);
```

Désactivation des offres SOFT fantômes à la fin du case `preislis` :
```typescript
await supabase.from('supplier_offers')
  .update({ is_active: false })
  .eq('supplier', 'SOFT')
  .lt('last_seen_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());
```

---

### 5. Nouveau hook `src/hooks/useBatchRecompute.ts`

```typescript
interface BatchProgress {
  processed: number;
  total: number;
  errors: number;
  done: boolean;
  percent: number;
}

export function useBatchRecompute() {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const run = async () => {
    setIsRunning(true);
    setProgress({ processed: 0, total: 0, errors: 0, done: false, percent: 0 });
    let offset = 0;
    const LIMIT = 500;
    let total = 0;
    let totalProcessed = 0;
    let totalErrors = 0;

    try {
      while (true) {
        const { data, error } = await supabase.rpc('admin_recompute_all_rollups', {
          p_limit: LIMIT,
          p_offset: offset,
        });
        if (error) throw error;
        total = data.total;
        totalProcessed += data.processed;
        totalErrors += data.errors;
        offset = data.next_offset;
        setProgress({
          processed: totalProcessed,
          total,
          errors: totalErrors,
          done: data.done,
          percent: total > 0 ? Math.round((totalProcessed / total) * 100) : 0,
        });
        if (data.done) break;
        await new Promise(r => setTimeout(r, 200)); // throttle
      }
      toast({ title: "Recalcul terminé", description: `${totalProcessed} produits traités, ${totalErrors} erreurs` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  return { run, isRunning, progress };
}
```

---

### 6. Nouvelle section dans `src/pages/AdminAutomations.tsx`

La page existante `AdminAutomations.tsx` doit recevoir une nouvelle section "Recalcul des rollups prix/stock". Elle contient :

- Titre : "Recalcul global prix public & disponibilité"
- Explication : "Recalcule `public_price_ttc` et `is_available` pour tous les produits actifs selon les offres fournisseurs actives."
- Bouton "Lancer le recalcul" (désactivé pendant l'exécution)
- Barre de progression `Progress` de shadcn avec `{percent}%`
- Compteurs : `{processed} / {total}` produits · `{errors}` erreurs
- Badge vert "Terminé" quand `done=true`

---

### 7. Sidebar — Ajout entrée "Offres fournisseurs"

Dans `src/components/admin/AdminSidebar.tsx`, groupe "Pricing & Concurrence", ajouter :
```typescript
{ title: "Offres fournisseurs", icon: Layers, path: "/admin/product-offers" }
```

Cette entrée pointe vers une page listant les produits avec leurs statuts de rollup (distinct de `/admin/products/:id/offers` qui est la fiche par produit).

---

## Ordre d'exécution

| # | Fichier | Tickets |
|---|---------|---------|
| 1 | Migration SQL batch recompute RPC | C — admin_recompute_all_rollups |
| 2 | `import-comlandi/index.ts` | B — supplier_offers COMLANDI + Liderpapel + recompute batch |
| 3 | `import-alkor/index.ts` | B — supplier_offers ALKOR (sans prix) |
| 4 | `import-softcarrier/index.ts` | B — supplier_offers SOFT (preislis + tarifsb2b + lagerbestand) |
| 5 | `src/hooks/useBatchRecompute.ts` | C — hook progression |
| 6 | `src/pages/AdminAutomations.tsx` | C — section UI batch recompute |
| 7 | `src/components/admin/AdminSidebar.tsx` | Navigation |

## Piège "offres fantômes" — solution retenue

Après chaque import flux complet :
- `UPDATE supplier_offers SET is_active=false WHERE supplier='X' AND last_seen_at < now() - interval '3 days'`
- Le seuil de 3 jours est adapté si le flux est hebdomadaire (passer à 8 jours)
- Pas de DELETE : les offres désactivées restent visibles en backoffice avec le badge "Inactif"
- Le rollup ne comptabilise que les offres `is_active=true`

## Ce qui n'est PAS dans ce plan

- Prix ALKOR depuis un fichier prix dédié (ALKOR ne fournit pas de prix dans son catalogue) — ticket futur
- Recalcul automatique planifié (cron) — ticket futur post-validation manuelle
- Interface de configuration du seuil "offres fantômes" (3j / 8j)
