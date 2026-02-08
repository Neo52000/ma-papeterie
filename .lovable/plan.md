

# Plan : Collecteur d'Images (2 sources)

## Objectif

Creer une fonctionnalite complete de collecte d'images depuis deux sites fournisseurs :
- **Ma-rentree-scolaire** (`img1.ma-rentree-scolaire.fr`) - acces public
- **AlkorShop B2B** (`b2b.alkorshop.com`) - acces authentifie par cookie de session

Le systeme crawle les pages, extrait toutes les URLs d'images, les telecharge dans Supabase Storage, et affiche une galerie avec export CSV.

---

## Architecture generale

```text
+------------------+     +-------------------+     +------------------+
|   UI Admin       |     | Edge Functions    |     | Supabase         |
|   /admin/        |---->| start-crawl       |---->| crawl_jobs       |
|   image-collector|     | run-crawl (BFS)   |     | crawl_pages      |
|                  |<----| set-alkor-cookie  |     | crawl_images     |
|   Galerie +      |     | get-crawl-job     |     | Storage bucket:  |
|   Export CSV     |     |                   |     | image-crawls     |
+------------------+     +-------------------+     +------------------+
```

---

## 1. Base de donnees (Migration SQL)

### Nouvelles tables

**`crawl_jobs`** - Suivi des jobs de crawl
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | Identifiant unique |
| source | text CHECK ('MRS_PUBLIC','ALKOR_B2B') | Source du crawl |
| start_urls | text[] | URLs de depart |
| status | text CHECK ('queued','running','done','error','canceled') | Statut |
| max_pages | int (defaut 800) | Limite de pages |
| max_images | int (defaut 3000) | Limite d'images |
| delay_ms | int (defaut 150) | Delai entre requetes |
| pages_visited | int (defaut 0) | Compteur pages |
| images_found | int (defaut 0) | Compteur images trouvees |
| images_uploaded | int (defaut 0) | Compteur images uploadees |
| last_error | text | Derniere erreur |
| created_by | uuid | Admin createur |
| created_at / updated_at | timestamptz | Horodatage |

**`crawl_pages`** - Pages visitees
| Colonne | Type |
|---------|------|
| id | uuid PK |
| job_id | uuid FK -> crawl_jobs ON DELETE CASCADE |
| page_url | text |
| http_status | int |
| links_found | int |
| images_on_page | int |
| fetched_at | timestamptz |
| UNIQUE(job_id, page_url) | |

**`crawl_images`** - Images collectees
| Colonne | Type |
|---------|------|
| id | uuid PK |
| job_id | uuid FK -> crawl_jobs ON DELETE CASCADE |
| page_url | text |
| source_url | text |
| storage_path | text |
| storage_public_url | text |
| content_type | text |
| sha256 | text |
| bytes | int |
| created_at | timestamptz |
| UNIQUE(job_id, source_url) | |

### Politiques RLS

Toutes les tables : acces restreint aux roles `admin` et `super_admin` uniquement (USING + WITH CHECK).

### Bucket Storage

- Nom : `image-crawls`
- Acces : prive (URLs signees pour affichage)
- Structure : `{job_id}/{sha256}_{filename}`

---

## 2. Edge Functions (4 fonctions)

### A) `start-crawl` (POST)

- Recoit `{ source, start_urls, max_pages, max_images, delay_ms }`
- **Allowlist stricte** : valide que chaque URL appartient au domaine autorise selon la source
  - MRS_PUBLIC -> `img1.ma-rentree-scolaire.fr`
  - ALKOR_B2B -> `b2b.alkorshop.com`
- Cree le job en status `queued`
- Appelle `run-crawl` de facon asynchrone (fire-and-forget)
- Retourne le `job_id` immediatement

### B) `run-crawl` (POST, verify_jwt=false)

Le coeur du systeme - crawl BFS (Breadth-First Search) :

1. **Fetch de page** avec headers adaptes :
   - MRS_PUBLIC : User-Agent standard, pas de cookie
   - ALKOR_B2B : injecte `Cookie: <valeur>` depuis `Deno.env.get('ALKOR_SESSION_COOKIE')`
2. **Extraction d'images** depuis le HTML :
   - `<img src="...">` et `<img srcset="...">`
   - `<source srcset="...">`
   - `CSS inline url(...)`
   - Liens directs vers fichiers images (jpg, png, gif, webp, svg, avif)
3. **Deduplication** par `source_url` (dans le job) et par `sha256` (contenu identique)
4. **Telechargement** : fetch image -> calcul SHA256 -> upload Storage -> enregistre `crawl_images`
5. **Suivi de liens** : extrait liens `<a href>` du meme domaine, les ajoute a la file BFS
6. **Limites** : respect de `max_pages`, `max_images`, `delay_ms`
7. **Retry** : 2 tentatives max par URL, timeout 15s
8. **Progression** : mise a jour de `crawl_jobs` toutes les 10 pages
9. **Gestion d'erreur** : en cas d'erreur fatale, statut -> `error` + `last_error`

### C) `set-alkor-cookie` (POST, admin only)

- Recoit `{ cookie_value }`
- Verifie que l'appelant est admin/super_admin (via JWT)
- Stocke la valeur dans le secret serveur `ALKOR_SESSION_COOKIE` via l'API Management Supabase
- Note : comme l'API Management necessite un token d'acces special, on utilisera une approche pragmatique : stocker le cookie dans une table securisee `admin_secrets` avec RLS admin-only, lue uniquement par les edge functions via service_role_key
- Retourne OK sans renvoyer la valeur

### D) `get-crawl-job` (GET)

- Parametre : `jobId` en query string
- Retourne les details du job + images paginees (limit/offset)
- Genere des URLs signees pour les images du bucket prive

---

## 3. Fichiers Frontend

### Nouvelle page : `src/pages/AdminImageCollector.tsx`

Page admin avec 2 onglets (Tabs) :

**Onglet "Ma-rentree-scolaire (Public)"** :
- Textarea `start_urls` (pre-rempli avec `https://img1.ma-rentree-scolaire.fr/`)
- Champs `max_pages` (800), `max_images` (3000), `delay_ms` (150)
- Bouton "Lancer le crawl"

**Onglet "AlkorShop B2B (Auth)"** :
- Memes champs que ci-dessus (pre-rempli avec `https://b2b.alkorshop.com/`)
- Section speciale "Cookie de session" :
  - Bouton "Mettre a jour le cookie de session" -> ouvre un dialog avec textarea
  - Encart explicatif : "Comment recuperer le cookie de session (Chrome) : DevTools (F12) > Network > cliquer sur une requete > Headers > Cookie > copier la valeur complete"
  - Le cookie n'est jamais affiche apres enregistrement

**Section Jobs** (commune aux 2 onglets) :
- Liste des jobs avec statut, progression, date
- Detail d'un job au clic :
  - Barre de progression (pages_visited/max_pages, images_uploaded/max_images)
  - Logs d'erreurs
  - Galerie d'images en grille avec recherche et pagination
  - Bouton "Export CSV" (source_url, page_url, storage_url, content_type, sha256)

### Nouveau hook : `src/hooks/useCrawlJobs.ts`

- `useQuery` pour lister les jobs
- `useQuery` pour le detail d'un job + ses images
- `useMutation` pour lancer un crawl
- `useMutation` pour sauvegarder le cookie Alkor
- Fonction `exportCsv` cote client

### Modifications existantes

**`src/components/admin/AdminSidebar.tsx`** :
- Ajout entree menu "Collecteur Images" avec icone `ImageIcon` vers `/admin/image-collector`

**`src/App.tsx`** :
- Ajout route `/admin/image-collector` -> `AdminImageCollector`

---

## 4. Securite

| Point | Implementation |
|-------|---------------|
| Allowlist domaines | Validation stricte dans `start-crawl` + verification a chaque fetch dans `run-crawl` |
| Cookie Alkor | Jamais en front, jamais en clair dans tables publiques. Stocke dans table `admin_secrets` accessible uniquement via service_role |
| RLS | Toutes les tables crawl_* : admin/super_admin only |
| Bucket Storage | Prive, URLs signees avec expiration |
| JWT | `start-crawl`, `set-alkor-cookie`, `get-crawl-job` verifient le JWT et le role |
| Rate limiting | `delay_ms` configurable, timeout 15s par requete |

---

## 5. Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| `supabase/migrations/..._create_crawl_tables.sql` | Creer (tables + RLS + bucket) |
| `supabase/functions/start-crawl/index.ts` | Creer |
| `supabase/functions/run-crawl/index.ts` | Creer |
| `supabase/functions/set-alkor-cookie/index.ts` | Creer |
| `supabase/functions/get-crawl-job/index.ts` | Creer |
| `src/pages/AdminImageCollector.tsx` | Creer |
| `src/hooks/useCrawlJobs.ts` | Creer |
| `src/components/admin/AdminSidebar.tsx` | Modifier (ajout menu) |
| `src/App.tsx` | Modifier (ajout route) |
| `supabase/config.toml` | Modifier (ajout fonctions) |
| `src/integrations/supabase/types.ts` | Modifier (types generes) |

---

## 6. Limites et considerations

- **Timeout Edge Functions** : Les Edge Functions ont un timeout de ~60s. Le crawl BFS sera concu pour traiter par lots et sauvegarder la progression regulierement. Si le timeout est atteint, le job peut etre relance et reprendra la ou il s'etait arrete (grace aux pages deja enregistrees dans `crawl_pages`).
- **Taille du bucket** : Les images sont stockees telles quelles, pas de redimensionnement. Le nettoyage est manuel.
- **Cookie Alkor** : Expire selon la session du site B2B. L'admin devra le mettre a jour manuellement si la session expire.

