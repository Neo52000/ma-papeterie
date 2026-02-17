

# Integration du catalogue fournisseur soft-carrier France

## Contexte

Le document "Trame d'integration fournisseur" de soft-carrier France (Papeterie de l'Est SAS, Colmar) decrit un ecosysteme complet de 7 sources de donnees pour alimenter le site en produits, prix, stocks et commandes. Ce plan adapte cette trame au schema existant de l'application.

## Analyse du gap entre la trame et le schema actuel

La table `products` actuelle possede deja : `ean`, `sku_interne`, `price_ht`, `price_ttc`, `tva_rate`, `eco_tax`, `weight_kg`, `dimensions_cm`, `manufacturer_code`, `attributs` (JSONB).

La table `supplier_products` possede : `supplier_reference`, `supplier_price`, `stock_quantity`, `lead_time_days`, `min_order_quantity`, `quantity_discount` (JSON).

**Ce qui manque pour couvrir la trame soft-carrier :**
- Champs produit : `ref_softcarrier` (cle centrale 18 chiffres), `ref_b2b`, `code_b2b`, `name_short`, `subcategory`, `brand`, `oem_ref`, `vat_code`, `country_origin`, `is_end_of_life`, `is_special_order`, `customs_code`
- Table `supplier_price_tiers` : prix paliers degressifs (6 niveaux) avec quantites seuils
- Table `product_packagings` : multi-conditionnement (UMV, UVE, ENV, EMB, Palette) avec EAN, poids et dimensions par niveau
- Table `supplier_stock_snapshots` : historique stock temps reel horodate (LAGERBESTAND toutes les 10 min)
- Table `brands` : referentiel fabricants/marques (HERSTINFO.TXT)

---

## Plan d'implementation

### Etape 1 -- Schema de base de donnees

**Migration SQL** pour enrichir le modele :

1. **Enrichir `products`** avec les champs soft-carrier manquants :
   - `ref_softcarrier VARCHAR(18)` avec index unique -- cle de jointure centrale
   - `ref_b2b VARCHAR(20)`, `code_b2b INTEGER`
   - `name_short VARCHAR(60)` (designation courte)
   - `subcategory TEXT`
   - `brand TEXT`
   - `oem_ref VARCHAR(18)` (reference fabricant/OEM)
   - `vat_code SMALLINT` (1=normal 20%, 2=reduit 5.5%)
   - `country_origin VARCHAR(3)`
   - `is_end_of_life BOOLEAN DEFAULT false`
   - `is_special_order BOOLEAN DEFAULT false`
   - `customs_code VARCHAR(20)`

2. **Creer `brands`** -- referentiel marques (source : HERSTINFO.TXT) :
   - `id UUID PK`, `name VARCHAR(60)`, `company VARCHAR(60)`, `country VARCHAR(3)`, `website VARCHAR(100)`

3. **Creer `supplier_price_tiers`** -- prix paliers degressifs (source : PREISLIS colonnes J-U) :
   - `id UUID PK`, `product_id UUID FK`, `tier SMALLINT (1-6)`, `min_qty INTEGER`, `price_ht NUMERIC(10,2)`, `price_pvp NUMERIC(10,2)`, `tax_cop NUMERIC(6,4)`, `tax_d3e NUMERIC(6,4)`
   - Contrainte UNIQUE sur `(product_id, tier)`

4. **Creer `product_packagings`** -- conditionnements multi-niveaux (source : TarifsB2B) :
   - `id UUID PK`, `product_id UUID FK`, `type TEXT CHECK (UMV, UVE, ENV, EMB, Palette)`, `qty INTEGER`, `ean VARCHAR(18)`, `weight_gr INTEGER`, `dimensions VARCHAR(50)`

5. **Creer `supplier_stock_snapshots`** -- historique stock horodate (source : LAGERBESTAND) :
   - `id UUID PK`, `ref_softcarrier VARCHAR(18)`, `qty_available INTEGER`, `delivery_week VARCHAR(10)`, `fetched_at TIMESTAMPTZ DEFAULT now()`
   - Index sur `(ref_softcarrier, fetched_at DESC)` pour acces rapide au dernier snapshot

6. **Politiques RLS** : lecture publique sur `brands`, admin-only pour ecriture sur toutes les nouvelles tables.

### Etape 2 -- Edge Function `import-softcarrier`

Nouvelle edge function centrale qui gere les 4 parsers principaux :

- **Endpoint** : `POST /import-softcarrier`
- **Body** : `{ source: "preislis" | "artx" | "tarifsb2b" | "herstinfo" | "lagerbestand", data: string (contenu brut du fichier) }`

**Parsers implementes :**

| Source | Logique |
|--------|---------|
| `herstinfo` | Split par TAB, 8 champs -> insert/upsert dans `brands` |
| `preislis` | Split par TAB, 42 colonnes, decimale virgule -> point. Upsert `products` (via `ref_softcarrier`), insert `supplier_price_tiers` (6 paliers) |
| `artx` | Parse largeur fixe : filtre langue=003, positions 5-22 (ref) + 23-3742 (62x60 chars descriptions) -> update `products.description` |
| `tarifsb2b` | CSV point-virgule UTF-8 BOM. Enrichir `products` (descriptions longues, taxes, PVP), creer `product_packagings` (UMV/UVE/ENV/EMB/Palette avec EAN) |
| `lagerbestand` | CSV 3 champs -> insert `supplier_stock_snapshots` + update `supplier_products.stock_quantity` |

**Points de vigilance techniques integres :**
- Conversion CP850 -> UTF-8 pour PREISLIS/HERSTINFO/ARTX
- Remplacement virgule decimale par point
- Horodatage systematique des snapshots stock
- Logs dans `supplier_import_logs` pour chaque import

### Etape 3 -- Edge Function `softcarrier-live-price`

Proxy vers l'API hbas de soft-carrier pour consultation prix/stock temps reel sur la fiche produit :

- **Endpoint** : `GET /softcarrier-live-price?ref=XXXXXXXXXXXXXXXXXX&qty=1`
- Appel : `https://www.fr.softcarrier.com/hbas?aktion=1&firmenindikator=5&site=softfr&kundennr=XXX&userpassword=YYY&artikelnr=REF&menge=QTY`
- Parse du retour CSV : `reference ; prix_centimes ; delai_livraison ; stock ; semaine_reappro`
- Cache Supabase de 10 minutes (via `supplier_stock_snapshots`)
- Credentials FTP/API stockes dans `admin_secrets`

### Etape 4 -- Interface admin d'import soft-carrier

Nouvelle page **`/admin/softcarrier`** dans le back-office :

- **Upload de fichiers** : 5 zones distinctes pour chaque type de fichier (PREISLIS, ARTX, TarifsB2B, HERSTINFO, LAGERBESTAND)
- **Indicateurs** : dernier import par source, nombre d'articles importes, taux de matching
- **Tableau des produits non matches** : ref_softcarrier sans correspondance dans le catalogue, avec action de liaison manuelle
- **Monitoring LAGERBESTAND** : dernier refresh stock, age des donnees, alerte si > 30 min

### Etape 5 -- Affichage front-office enrichi

Modifications des composants existants pour exploiter les nouvelles donnees :

- **Fiche produit** (`ProductPage.tsx` / `ProductDetailModal.tsx`) :
  - Grille tarifaire degressive (paliers 1 a 6) depuis `supplier_price_tiers`
  - Selecteur de conditionnement (UMV/UVE/ENV) depuis `product_packagings`
  - Badge "Fin de serie" si `is_end_of_life = true`
  - Badge "Commande speciale" si `is_special_order = true`
  - Stock temps reel via appel `softcarrier-live-price` (avec cache 10 min)
  - Affichage eco-contributions (`tax_cop`, `tax_d3e`) si non nulles
  - Lien marque depuis `brands`

- **Catalogue** (`Catalogue.tsx`) :
  - Filtre par marque (nouveau)
  - Badge fin de serie / commande speciale
  - Prix affiche = palier 1 x (1 + TVA selon `vat_code`)

- **Panier** (`CartContext.tsx` / `CartSheet.tsx`) :
  - Calcul automatique du palier tarifaire applicable selon quantite commandee
  - Verification stock live avant validation

### Etape 6 -- Navigation admin

Ajout dans `AdminSidebar.tsx` :
- Nouvelle entree "soft-carrier" dans le groupe "Approvisionnement" avec icone dediee
- Route `/admin/softcarrier`

---

## Fichiers crees / modifies

| Fichier | Action |
|---------|--------|
| `supabase/migrations/xxx_softcarrier_schema.sql` | Creer (migration BDD) |
| `supabase/functions/import-softcarrier/index.ts` | Creer (parsers 5 sources) |
| `supabase/functions/softcarrier-live-price/index.ts` | Creer (proxy API hbas) |
| `src/pages/AdminSoftCarrier.tsx` | Creer (page admin import) |
| `src/hooks/useSoftCarrierImport.ts` | Creer (hook imports) |
| `src/hooks/useLivePrice.ts` | Creer (hook prix temps reel) |
| `src/components/product/PriceTiersGrid.tsx` | Creer (grille paliers) |
| `src/components/product/PackagingSelector.tsx` | Creer (selecteur conditionnement) |
| `src/integrations/supabase/types.ts` | Modifier (nouveaux types) |
| `src/components/admin/AdminSidebar.tsx` | Modifier (nouvelle entree) |
| `src/App.tsx` | Modifier (nouvelle route) |
| `src/pages/ProductPage.tsx` | Modifier (paliers, conditionnements, stock live) |
| `src/pages/Catalogue.tsx` | Modifier (filtre marque, badges) |
| `src/stores/cartStore.ts` | Modifier (calcul palier tarifaire) |

