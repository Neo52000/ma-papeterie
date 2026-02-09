

# Plan : Enrichissement d'Images Produits (refonte du collecteur)

## Probleme identifie

Le crawler BFS actuel ne fonctionne pas et ne fonctionnera pas :
- `img1.ma-rentree-scolaire.fr` retourne **HTTP 403** (protection anti-bot/Cloudflare)
- `b2b.alkorshop.com` retourne **HTTP 404** (necessite authentification navigateur)
- Meme les outils de scraping cote serveur ne peuvent pas acceder a ces sites
- `img1.ma-rentree-scolaire.fr` est un **CDN d'images**, pas un site a crawler

Le vrai besoin : associer des images reelles aux 7 produits de la base (tous en `/placeholder.svg`).

## Nouvelle approche : Systeme d'enrichissement multi-mode

Au lieu d'un crawler aveugle, construire un systeme centre sur les **produits** avec plusieurs methodes pour obtenir leurs images.

```text
+-------------------------------------------+
|     Enrichissement Images Produits         |
+-------------------------------------------+
|                                            |
|  Mode 1 : URL directe par produit         |
|  (coller une URL -> telecharge + associe)  |
|                                            |
|  Mode 2 : Import CSV en masse             |
|  (nom/EAN + URL image -> batch download)   |
|                                            |
|  Mode 3 : Upload direct                   |
|  (drag & drop image -> stocke + associe)   |
|                                            |
|  Mode 4 : Recherche CDN par EAN           |
|  (teste des patterns d'URL connus)         |
|                                            |
+-------------------------------------------+
         |
         v
  Supabase Storage (product-images/)
         |
         v
  products.image_url = URL signee/publique
```

---

## 1. Modifications de la page existante `/admin/image-collector`

Transformer la page en **"Enrichissement Images Produits"** avec 3 onglets :

### Onglet A : "Par produit" (principal)

- Liste des produits **sans image** (ou avec `/placeholder.svg`)
- Pour chaque produit :
  - Apercu du nom, categorie, EAN si disponible
  - **Champ "URL image"** : coller une URL d'image trouvee sur le site fournisseur (l'admin navigue dans son navigateur, fait clic droit > "Copier l'adresse de l'image")
  - **Bouton "Upload"** : drag-and-drop ou selection de fichier local
  - **Bouton "Telecharger et associer"** : telecharge l'image depuis l'URL, la stocke dans Supabase Storage, met a jour `products.image_url`
  - Miniature de l'image actuelle

### Onglet B : "Import en masse"

- Upload d'un fichier CSV avec colonnes : `nom_produit` (ou `ean`), `image_url`
- Le systeme :
  1. Matche chaque ligne avec un produit existant (par nom exact ou EAN)
  2. Telecharge chaque image
  3. Stocke dans Supabase Storage
  4. Met a jour `products.image_url`
- Affiche un rapport (succes/echecs)

### Onglet C : "Crawl avance" (existant, conserve)

- Le formulaire de crawl existant reste disponible pour une utilisation future
- Ajout d'un encart d'avertissement expliquant que les sites bloquent actuellement les requetes serveur
- Guide : "Comment recuperer les images manuellement depuis votre navigateur"

---

## 2. Nouveau bucket Storage

- **Bucket** : `product-images` (public, pour un acces direct sans URLs signees)
- **Structure** : `product-images/{product_id}/{filename}`
- Politiques : admin/super_admin peuvent upload, lecture publique

---

## 3. Nouvelle Edge Function : `enrich-product-image`

**POST** - Recoit :
```json
{
  "product_id": "uuid",
  "image_url": "https://img1.ma-rentree-scolaire.fr/path/to/image.jpg"
}
```

**Logique :**
1. Verifie que l'utilisateur est admin/super_admin
2. Telecharge l'image depuis l'URL (avec headers navigateur pour maximiser les chances)
3. Valide que c'est bien une image (content-type)
4. Upload dans `product-images/{product_id}/{filename}`
5. Met a jour `products.image_url` avec l'URL publique du bucket
6. Retourne succes avec la nouvelle URL

**Securite :**
- Pas d'allowlist de domaine (l'admin peut coller n'importe quelle URL d'image)
- Validation du content-type (doit etre une image)
- Taille max : 10 MB
- JWT requis + role admin

---

## 4. Nouvelle Edge Function : `enrich-products-batch`

**POST** - Recoit :
```json
{
  "items": [
    { "product_name": "Stylo Pilot G2", "image_url": "https://..." },
    { "ean": "3086126601410", "image_url": "https://..." }
  ]
}
```

**Logique :**
1. Pour chaque item, matche avec un produit existant (par nom ou EAN)
2. Telecharge l'image
3. Upload dans Storage
4. Met a jour le produit
5. Retourne un rapport detaille

---

## 5. Upload direct (cote client)

Utiliser le SDK Supabase Storage directement depuis le front :
- L'admin selectionne un fichier ou fait un drag-and-drop
- Upload vers `product-images/{product_id}/{timestamp}_{filename}`
- Met a jour `products.image_url` via un update Supabase

---

## 6. Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| `supabase/migrations/..._product_images_bucket.sql` | Creer (bucket + RLS) |
| `supabase/functions/enrich-product-image/index.ts` | Creer |
| `supabase/functions/enrich-products-batch/index.ts` | Creer |
| `src/pages/AdminImageCollector.tsx` | Modifier (refonte complete) |
| `src/components/image-collector/ProductImageEnricher.tsx` | Creer (liste produits sans image) |
| `src/components/image-collector/BatchImageImport.tsx` | Creer (import CSV) |
| `src/hooks/useProductImages.ts` | Creer (hooks pour enrichissement) |
| `supabase/config.toml` | Modifier (ajout fonctions) |

---

## 7. Guide utilisateur integre dans l'UI

Un encart permanent en haut de la page expliquant :

**"Comment recuperer les images des fournisseurs :"**
1. Ouvrir le site fournisseur dans votre navigateur (ex: ma-rentree-scolaire.fr)
2. Naviguer vers la fiche du produit souhaite
3. Faire un clic droit sur l'image du produit > "Copier l'adresse de l'image"
4. Coller l'URL dans le champ correspondant ci-dessous
5. Cliquer sur "Telecharger et associer"

---

## 8. Conservation du crawler existant

Le systeme de crawl BFS existant (tables `crawl_jobs`, `crawl_pages`, `crawl_images` et les 4 edge functions) reste en place pour une utilisation future. Il sera accessible dans l'onglet "Crawl avance" mais ne sera plus l'approche principale.

---

## Resume

L'approche change de paradigme :
- **Avant** : Crawler aveugle de sites entiers (bloque par les protections anti-bot)
- **Apres** : Enrichissement cible, produit par produit, avec l'admin dans la boucle

Cela garantit que chaque image est correctement associee au bon produit, et contourne le probleme des protections anti-bot puisque c'est l'admin qui navigue sur le site dans son propre navigateur authentifie.

