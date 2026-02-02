

# Plan : Import Multi-format des Tarifs Fournisseurs (CSV, XML, JSON)

## Objectif
Remplacer le composant d'import CSV actuel par un composant unifié permettant d'importer les catalogues fournisseurs dans 3 formats : **CSV**, **XML** et **JSON**, avec parsing intelligent et matching automatique des produits.

---

## Architecture proposee

```text
+------------------+     +----------------------+     +---------------------+
|   Front-end      |     |   Edge Function      |     |   Base de donnees   |
|   (React)        | --> | import-supplier-     | --> |   supplier_products |
|                  |     | pricing              |     |   products          |
+------------------+     +----------------------+     +---------------------+
       |                         |
       v                         v
  Upload fichier           Parsing multi-format
  + Preview                + AI matching (optionnel)
  + Mapping colonnes       + Upsert produits
```

---

## 1. Composant Front-end : SupplierPricingImport

Creer un nouveau composant `src/components/suppliers/SupplierPricingImport.tsx` qui remplacera l'actuel `CsvImport.tsx`.

### Fonctionnalites :
- **Selection du format** : Radio buttons pour choisir CSV, XML ou JSON
- **Upload de fichier** : Accept dynamique selon le format (.csv, .xml, .json)
- **Preview des donnees** : Affichage des premieres lignes parsees
- **Mapping des colonnes** : Interface pour faire correspondre les colonnes du fichier aux champs attendus
- **Validation** : Verification des champs obligatoires avant import
- **Progression** : Barre de progression pendant l'import

### Structure des donnees attendue (normalisee) :
```typescript
interface SupplierPricingRow {
  supplier_reference: string;    // Reference fournisseur
  product_name?: string;         // Nom du produit
  ean?: string;                  // Code EAN (prioritaire pour matching)
  supplier_price: number;        // Prix d'achat HT
  stock_quantity?: number;       // Stock disponible
  lead_time_days?: number;       // Delai livraison
  min_order_quantity?: number;   // Quantite minimum
  quantity_discount?: object;    // Remises quantitatives (JSON)
}
```

---

## 2. Parsers Front-end

Creer un fichier `src/lib/supplierPricingParsers.ts` avec les fonctions de parsing :

### Parser CSV :
```typescript
function parseCsv(content: string): SupplierPricingRow[]
// - Detection automatique du separateur (, ou ;)
// - Gestion des guillemets
// - Conversion des nombres (virgule europeenne)
```

### Parser XML :
```typescript
function parseXml(content: string): SupplierPricingRow[]
// - Support des formats courants fournisseurs
// - Detection des balises : <product>, <article>, <item>
// - Extraction : <price>, <prix>, <reference>, <ean>
```

### Parser JSON :
```typescript
function parseJson(content: string): SupplierPricingRow[]
// - Format tableau direct
// - Format objet avec propriete "products", "items", "articles"
// - Aplatissement des structures imbriquees
```

---

## 3. Edge Function : import-supplier-pricing

Creer `supabase/functions/import-supplier-pricing/index.ts`

### Logique :
1. **Reception** : Fichier + supplierId + mapping colonnes + format
2. **Parsing** (si pas deja fait cote front) selon le format
3. **Matching produits** :
   - Priorite 1 : EAN exact (si fourni)
   - Priorite 2 : Reference fournisseur existante
   - Priorite 3 : IA (nom produit) via Gemini - optionnel
4. **Upsert** dans `supplier_products` :
   - Si produit trouve : mise a jour du prix, stock, delai
   - Si produit non trouve : creation avec product_id = null (a matcher manuellement)
5. **Rapport** : Nombre de succes, erreurs, produits non matches

### Endpoints :
- `POST /import-supplier-pricing` : Import complet
- Params : `{ supplierId, format, data, columnMapping, useAiMatching }`

---

## 4. Mise a jour AdminSuppliers

Modifier `src/pages/AdminSuppliers.tsx` :
- Remplacer l'onglet "Import CSV" par "Import Catalogue"
- Integrer le nouveau composant `SupplierPricingImport`

---

## 5. Historique des imports

### Nouvelle table : `supplier_import_logs`
```sql
CREATE TABLE supplier_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id),
  format text NOT NULL, -- 'csv', 'xml', 'json'
  filename text,
  total_rows int,
  success_count int,
  error_count int,
  unmatched_count int,
  imported_by uuid,
  imported_at timestamptz DEFAULT now(),
  errors jsonb -- Details des erreurs
);
```

---

## Details techniques

### Fichiers a creer :
1. `src/lib/supplierPricingParsers.ts` - Parsers CSV/XML/JSON
2. `src/components/suppliers/SupplierPricingImport.tsx` - Composant d'import
3. `supabase/functions/import-supplier-pricing/index.ts` - Edge function

### Fichiers a modifier :
1. `src/pages/AdminSuppliers.tsx` - Remplacement de CsvImport par le nouveau composant
2. `supabase/config.toml` - Declaration de la nouvelle edge function

### Migration SQL :
- Creation de la table `supplier_import_logs`

---

## Exemple de formats supportes

### CSV :
```csv
reference;nom;ean;prix_ht;stock;delai
REF001;Ramette A4 80g;3660019502424;3.50;1000;2
REF002;Stylo Bic Cristal;3086123100015;0.25;5000;1
```

### XML :
```xml
<catalogue>
  <produit>
    <reference>REF001</reference>
    <designation>Ramette A4 80g</designation>
    <ean>3660019502424</ean>
    <prix>3.50</prix>
    <stock>1000</stock>
  </produit>
</catalogue>
```

### JSON :
```json
{
  "products": [
    {
      "ref": "REF001",
      "name": "Ramette A4 80g",
      "ean": "3660019502424",
      "price": 3.50,
      "stock": 1000
    }
  ]
}
```

---

## Avantages

- **Flexibilite** : Compatible avec les exports de la plupart des fournisseurs
- **Robustesse** : Detection automatique des formats et separateurs
- **Tracabilite** : Historique complet des imports
- **Intelligence** : Matching IA optionnel pour les produits sans EAN
- **UX** : Preview avant import, mapping visuel des colonnes

