

# Plan : Import intelligent de catalogues fournisseurs par IA

## Objectif

Remplacer le mapping manuel des colonnes par un **agent IA** qui analyse automatiquement le fichier fournisseur (CSV, XML, JSON, ou meme texte brut copie-colle) et detecte les colonnes, normalise les donnees et les importe.

Le projet utilise deja Lovable AI Gateway (cle `LOVABLE_API_KEY` configuree). On va l'utiliser cote Edge Function.

## Fonctionnement

```text
+-----------------------------------------+
|  Admin uploade un fichier catalogue      |
|  (CSV, XML, JSON, ou colle du texte)     |
+-----------------------------------------+
              |
              v
+-----------------------------------------+
|  Edge Function : ai-import-catalog      |
+-----------------------------------------+
|  1. Envoie un echantillon (20 lignes)   |
|     a l'IA via Lovable AI Gateway       |
|  2. L'IA retourne le mapping detecte    |
|     + les donnees normalisees           |
|  3. L'admin valide/ajuste le mapping    |
|  4. Traitement batch de toutes les      |
|     lignes avec le mapping valide       |
|  5. Matching produits par EAN/nom/ref   |
|  6. Upsert dans supplier_products      |
+-----------------------------------------+
              |
              v
+-----------------------------------------+
|  Rapport : X importes, Y non matches   |
+-----------------------------------------+
```

## Ce qui change par rapport a l'existant

| Aspect | Avant (actuel) | Apres (IA) |
|--------|---------------|------------|
| Mapping colonnes | Manuel (dropdowns) | Auto-detecte par l'IA, l'admin valide |
| Formats supportes | CSV, XML, JSON structures | + texte brut, formats non standard |
| Nettoyage donnees | Parsing basique | IA normalise noms, prix, EAN |
| Etape 3 "Mapping" | Obligatoire | Pre-rempli par l'IA, validation en 1 clic |

## Fichiers a creer/modifier

### 1. Nouvelle Edge Function : `ai-import-catalog`

**Fichier** : `supabase/functions/ai-import-catalog/index.ts`

Deux modes d'appel :

**Mode "analyze"** (etape 1) :
- Recoit un echantillon du fichier (premieres 20 lignes)
- Appelle Lovable AI avec tool calling pour extraire le mapping
- Retourne le mapping detecte + un apercu des donnees normalisees

**Mode "import"** (etape 2) :
- Recoit les donnees completes + le mapping valide par l'admin
- Traite chaque ligne, matche avec les produits existants (EAN/nom/ref)
- Upsert dans `supplier_products`
- Log dans `supplier_import_logs`
- Retourne le rapport

L'IA utilisera le modele `google/gemini-3-flash-preview` avec tool calling pour structurer la sortie :

```text
Tool : analyze_catalog
Parametres :
  - detected_columns : tableau des colonnes detectees avec leur role
  - sample_rows : les premieres lignes normalisees
  - confidence : score de confiance du mapping
```

### 2. Modifier le composant d'import

**Fichier** : `src/components/suppliers/SupplierPricingImport.tsx`

Modifications :
- Etape 1 "Upload" : inchange (selection fichier)
- **Nouvelle etape 2 "Analyse IA"** : envoi a l'edge function, affichage du mapping detecte avec scores de confiance, l'admin peut ajuster si besoin
- Etape 3 "Mapping" : pre-rempli par l'IA (plus besoin de mapper manuellement sauf correction)
- Etapes 4-5 : inchangees

Ajout d'un **mode "texte brut"** : un textarea ou l'admin peut coller directement du contenu (ex: copie d'un PDF fournisseur).

### 3. Mettre a jour la config

**Fichier** : `supabase/config.toml` - Ajouter la nouvelle fonction `ai-import-catalog`

## Details techniques

### Prompt IA pour l'analyse

L'Edge Function enverra a l'IA :
- Les en-tetes du fichier
- Les 10-20 premieres lignes de donnees
- Le contexte : "catalogue fournisseur de fournitures de bureau/scolaires"

L'IA devra identifier via tool calling :
- Quelle colonne = reference fournisseur
- Quelle colonne = nom produit
- Quelle colonne = prix (HT ou TTC)
- Quelle colonne = EAN/code-barres
- Quelle colonne = stock disponible
- Quelle colonne = delai de livraison
- Quelle colonne = quantite minimum

### Gestion des erreurs

- Rate limit (429) : message "Veuillez reessayer dans quelques secondes"
- Credit (402) : message "Credits IA insuffisants"
- Fichier trop gros : traitement par lots de 50 lignes

### Securite

- JWT requis + role admin/super_admin
- Le fichier reste cote client, seul le contenu texte est envoye
- Pas d'execution de code depuis le fichier

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `supabase/functions/ai-import-catalog/index.ts` | Creer |
| `src/components/suppliers/SupplierPricingImport.tsx` | Modifier (ajout etape IA + mode texte) |
| `supabase/config.toml` | Modifier (ajouter fonction) |

