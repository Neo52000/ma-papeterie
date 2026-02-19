

# Integration des fichiers Descriptions, MultimediaLinks et RelationedProducts

## Problematique

Ces 3 fichiers JSON Comlandi/Liderpapel font plus de 20 Mo chacun. Ils ne peuvent pas etre envoyes en un seul appel a l'Edge Function (limite de taille du body et timeout). La solution repose sur un **parsing cote client** avec envoi par lots (batches).

## Structures JSON attendues (spec Comlandi v5.8)

### Descriptions_fr.json
```text
root > Products > Product[]
  - id (reference produit)
  - ownReference (optionnel)
  - Descriptions > Description[]
    - DescCode : INT_VTE (titre), TXT_RCOM (description longue),
                 MINI_DESC (courte), ABRV_DEC (abregee), AMPL_DESC (HTML etendue)
    - DescType : type texte
    - Texts > Text[] avec attribut "lang" (fr_FR, es_ES...)
```

### MultimediaLinks_fr.json
```text
root > Products > Product[]
  - id
  - ownReference (optionnel)
  - MultimediaLinks > MultimediaLink[]
    - mmlType : IMG, DOC, VIDEO...
    - lang
    - modifiedAt (optionnel)
    - Name, Url, Active, MimeType
    - AngleView, ImageWidth, ImageHeight
```

### RelationedProducts_fr.json
```text
root > Products > Product[]
  - id
  - RelationedProducts > RelationedProduct[]
    - type de relation (couleur, alternatif, complementaire)
    - id du produit lie
```

## Plan d'implementation

### 1. Migration SQL -- nouvelle table `product_relations`

Creer une table pour stocker les relations entre produits :

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| product_id | text | Reference produit source (id Comlandi) |
| related_product_id | text | Reference produit lie |
| relation_type | text | color, alternative, complementary |
| created_at | timestamptz | |

RLS : lecture publique, ecriture admin uniquement.

Les descriptions et images iront dans les tables existantes `product_seo` et `product_images` (enrichissement).

### 2. Edge Function `fetch-liderpapel-sftp` -- ajout de 3 nouveaux modes

Ajouter le traitement de `descriptions_json`, `multimedia_json` et `relations_json` dans le body :

**Mode Descriptions** (`descriptions_json` present) :
- Parse `root > Products > Product[]`
- Pour chaque produit, extraire les textes FR par DescCode
- Upsert dans `product_seo` : `meta_title` (INT_VTE), `description_courte` (MINI_DESC), `description_longue` (TXT_RCOM), `meta_description` (ABRV_DEC)
- Si AMPL_DESC present, stocker en description longue HTML
- Matching produit par `id` (reference Comlandi) via la colonne `supplier_ref` ou EAN dans `products`

**Mode MultimediaLinks** (`multimedia_json` present) :
- Parse `root > Products > Product[]`
- Pour chaque produit, extraire les liens de type IMG actifs
- Upsert dans `product_images` : `url_originale` = Url, `alt_seo` = Name, `source` = 'liderpapel', `is_principal` = true pour la premiere image
- Matching produit par id Comlandi

**Mode RelationedProducts** (`relations_json` present) :
- Parse `root > Products > Product[]`
- Inserer dans `product_relations` les couples (product_id, related_product_id, relation_type)

Chaque mode retourne un rapport (total, created, updated, errors).

### 3. Parsing cote client avec batching (AdminComlandi.tsx)

Comme les fichiers font plus de 20 Mo, le parsing se fait dans le navigateur :

1. L'utilisateur selectionne un fichier JSON volumineux
2. Le fichier est lu avec `file.text()` puis `JSON.parse()`
3. Le tableau de produits est decoupe en lots de 500
4. Chaque lot est envoye a `fetch-liderpapel-sftp` via `supabase.functions.invoke()`
5. Une barre de progression affiche l'avancement (batch X/Y)
6. Les resultats sont agreges et affiches

### 4. Interface Admin -- nouvelle carte "Enrichissement produits"

Ajouter dans l'onglet Liderpapel une nouvelle carte avec :

- 3 selecteurs de fichiers : Descriptions.json, MultimediaLinks.json, RelationedProducts.json
- Bouton "Importer l'enrichissement" avec progression
- Affichage des resultats (descriptions mises a jour, images ajoutees, relations creees)
- Possibilite d'importer chaque fichier independamment

## Fichiers modifies/crees

| Action | Fichier |
|--------|---------|
| Migration SQL | Creer table `product_relations` |
| Modifier | `supabase/functions/fetch-liderpapel-sftp/index.ts` (3 parsers + 3 modes) |
| Modifier | `src/pages/AdminComlandi.tsx` (carte enrichissement + batching client) |

## Section technique

### Pseudo-code du batching client

```text
const json = JSON.parse(await file.text())
const products = json.root?.Products?.Product || json.Products?.Product || []
const BATCH = 500
for (let i = 0; i < products.length; i += BATCH) {
  const batch = products.slice(i, i + BATCH)
  await supabase.functions.invoke('fetch-liderpapel-sftp', {
    body: { descriptions_json: { Products: { Product: batch } } }
  })
  // update progress
}
```

### Matching produit dans la base

Pour associer un id Comlandi a un produit local :
1. Chercher dans `supplier_products` par `supplier_ref = id`
2. Sinon chercher dans `products` par `ean` (via le Catalog deja importe)
3. Si aucun match, le produit est ignore (log warning)

