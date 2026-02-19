
# Adaptation de l'import Comlandi pour les tarifs Liderpapel via SFTP

## Contexte

Liderpapel est un fournisseur dont les tarifs sont distribues via le canal Comlandi. Plutot que de creer un nouveau pipeline, on etend l'existant (`import-comlandi` + `AdminComlandi`) pour supporter egalement les fichiers Liderpapel (Catalog.csv, Prices.csv, Stock.csv) avec leur logique de prix specifique.

## Modifications prevues

### 1. Stocker les identifiants SFTP comme secrets Supabase

Trois secrets a ajouter :
- `LIDERPAPEL_SFTP_HOST` = sftp.liderpapel.com
- `LIDERPAPEL_SFTP_USER` = 3321289
- `LIDERPAPEL_SFTP_PASS` = mcJg54W8@34d0j69b

### 2. Migration SQL

- Ajouter la colonne `cost_price` (numeric, nullable) sur `products` si elle n'existe pas deja (prix d'achat HT fournisseur)
- Creer la table `liderpapel_pricing_coefficients` :
  - `id` (uuid PK)
  - `family` (text, not null)
  - `subfamily` (text, nullable)
  - `coefficient` (numeric, not null, default 2.0)
  - `created_at`, `updated_at`
  - RLS : lecture/ecriture restreinte aux admins

### 3. Edge Function `import-comlandi` : ajout du mode Liderpapel

Etendre la fonction existante pour accepter un parametre `source: 'comlandi' | 'liderpapel'` dans le body JSON.

Quand `source === 'liderpapel'` :
- Le mapping des colonnes est adapte aux en-tetes CSV Liderpapel (reference, prix d'achat, prix conseille, famille, sous-famille...)
- La logique de prix change :
  - Stocker `cost_price` (prix d'achat HT)
  - Si un prix conseille TTC existe, l'utiliser pour `price_ttc` et deduire `price_ht`
  - Sinon, chercher le coefficient dans `liderpapel_pricing_coefficients` (match famille puis sous-famille, le plus specifique l'emporte), calculer `price_ttc = cost_price * coefficient * (1 + tva/100)`
  - Ajouter les eco-taxes (COP, D3E...) au prix final
- Les logs sont enregistres avec le format `liderpapel-catalogue` dans `supplier_import_logs`
- Le matching produit reste identique (par EAN, puis par reference)

Quand `source === 'comlandi'` (ou absent) : comportement actuel inchange.

### 4. Nouvelle Edge Function `fetch-liderpapel-sftp`

Fonction dediee a la recuperation SFTP :
- Se connecte au serveur SFTP avec les secrets
- Telecharge les fichiers CSV (Catalog.csv, Prices.csv, Stock.csv)
- Parse chaque fichier (separateur `;`, suppression en-tete)
- Fusionne les donnees (Catalog + Prices par reference, Stock pour les quantites)
- Appelle `import-comlandi` en interne avec `source: 'liderpapel'`
- Retourne le rapport d'import

Note technique : si `ssh2-sftp-client` ne fonctionne pas dans l'environnement Edge Functions Deno, un mode de repli sera prevu dans l'interface admin (upload manuel des 3 fichiers CSV).

### 5. Page Admin `AdminComlandi.tsx` : ajout d'un onglet Liderpapel

Transformer la page en onglets (Tabs) :
- **Onglet COMLANDI** : interface actuelle inchangee
- **Onglet LIDERPAPEL** : 
  - Bouton "Importer via SFTP" (appelle `fetch-liderpapel-sftp`)
  - Upload manuel de fichiers CSV en fallback
  - Section "Coefficients de marge" : tableau editable (famille, sous-famille, coefficient) avec ajout/suppression
  - Historique des imports filtres sur `format = 'liderpapel-catalogue'`

### 6. Planification cron quotidien

Job `pg_cron` execute tous les jours a minuit :
- Appelle `fetch-liderpapel-sftp` via `pg_net.http_post`
- Log du resultat dans `supplier_import_logs`

## Fichiers modifies/crees

| Action | Fichier |
|--------|---------|
| Migration SQL | Ajout `cost_price` sur products + table `liderpapel_pricing_coefficients` + job cron |
| Modifier | `supabase/functions/import-comlandi/index.ts` (ajout mode Liderpapel) |
| Creer | `supabase/functions/fetch-liderpapel-sftp/index.ts` |
| Modifier | `src/pages/AdminComlandi.tsx` (onglets + interface coefficients) |
| Creer | `src/hooks/useLiderpapelCoefficients.ts` |
| Modifier | `supabase/config.toml` (declaration `fetch-liderpapel-sftp`) |

## Section technique

### Logique de calcul du prix (pseudo-code)

```text
Si prix_conseille_ttc existe et > 0 :
    price_ttc = prix_conseille_ttc
    price_ht  = price_ttc / (1 + tva_rate/100)
Sinon :
    coefficient = chercher(famille, sous_famille) ou 2.0 par defaut
    price_ht    = cost_price * coefficient
    price_ttc   = price_ht * (1 + tva_rate/100)

eco_tax = taxe_cop + taxe_d3e + taxe_mob + ...
price_ttc = price_ttc + eco_tax
price     = price_ttc  (prix d'affichage)
```

### Fusion des 3 fichiers CSV

```text
Catalog.csv  --> reference, description, famille, sous-famille, EAN, marque...
Prices.csv   --> reference, prix_achat_ht, prix_conseille, tva, taxes...
Stock.csv    --> reference, quantite_disponible

Fusion par "reference" --> objet unifie par produit
```
