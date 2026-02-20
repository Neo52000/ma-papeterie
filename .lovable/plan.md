
# Import de fichiers JSON volumineux — MultimediaLinks, Descriptions_fr, RelatedProducts

## Diagnostic du problème

Les 3 fichiers (MultimediaLinks, Descriptions_fr, RelatedProducts) sont des exports Liderpapel qui peuvent peser entre 50 Mo et 500 Mo. Le flux actuel a trois points de rupture :

1. `file.text()` dans le navigateur charge le fichier entier en mémoire JS (RAM du navigateur limitée à ~500Mo pour une tab)
2. Le payload envoyé à l'edge function est limité à ~6MB par Supabase — les gros batches passent la limite
3. `parseJsonRobust` scanne char-par-char in-memory sur des fichiers de 600k+ caractères, ce qui gèle l'onglet

La solution : **uploader dans Supabase Storage, puis déclencher un traitement streamé côté serveur**. Le navigateur ne touche plus jamais le contenu du fichier.

---

## Architecture cible

```
Navigateur                  Supabase Storage              Edge Function
    │                              │                            │
    │── (1) upload brut ──────────>│                            │
    │                              │                            │
    │── (2) invoke "process-enrich-file" { storagePath } ──────>│
    │                              │                            │── (3) download stream
    │                              │<──────────────────────────│
    │<── (4) { job_id } ───────────────────────────────────────│
    │                              │                            │
    │── (5) poll job status ──────────────────────────────────>│
    │<── { progress, done, result } ──────────────────────────│
```

Le navigateur fait juste un `PUT` HTTP — il ne lit pas le fichier. C'est le serveur qui streame, parse, et traite en batches.

---

## Feature 1 — Bucket Storage pour les fichiers enrichissement

### Migration SQL

Créer un bucket `liderpapel-enrichment` (privé, max 500MB par fichier) dans Supabase Storage avec des politiques RLS admin-only.

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'liderpapel-enrichment',
  'liderpapel-enrichment',
  false,
  524288000, -- 500MB
  ARRAY['application/json', 'text/plain']
);

-- Politique : seuls les admins peuvent lire/écrire
CREATE POLICY "admin_storage_enrich" ON storage.objects
  FOR ALL USING (
    bucket_id = 'liderpapel-enrichment' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  );
```

---

## Feature 2 — Nouvelle Edge Function `process-enrich-file`

Cette fonction remplace l'envoi de batches JSON depuis le client. Elle :

1. Télécharge le fichier depuis Storage via `supabase.storage.from('liderpapel-enrichment').download(path)`
2. Parse le JSON de manière sécurisée (le serveur a assez de RAM)
3. Extrait les produits avec la logique `extractProducts` déjà existante dans `fetch-liderpapel-sftp`
4. Traite en batches de 200 et délègue à `fetch-liderpapel-sftp` pour chaque batch
5. Met à jour le statut dans une table `enrich_import_jobs` pour le polling UI
6. Supprime le fichier de Storage après traitement

```typescript
// supabase/functions/process-enrich-file/index.ts
Deno.serve(async (req) => {
  const { storagePath, fileType } = await req.json();
  // fileType: 'multimedia_json' | 'descriptions_json' | 'relations_json'
  
  // 1. Create job entry for tracking
  const jobId = crypto.randomUUID();
  await supabase.from('enrich_import_jobs').insert({ id: jobId, status: 'processing', storage_path: storagePath });
  
  // 2. Download from storage (edge function has ~512MB RAM)
  const { data: blob } = await supabase.storage.from('liderpapel-enrichment').download(storagePath);
  const text = await blob.text();
  const json = JSON.parse(text);
  
  // 3. Extract products
  const products = extractProducts(json);
  const BATCH = 500;
  let processed = 0;
  
  // 4. Process in batches
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const body = { [fileType]: { Products: { Product: batch } } };
    await supabase.functions.invoke('fetch-liderpapel-sftp', { body });
    
    processed += batch.length;
    await supabase.from('enrich_import_jobs').update({ processed_rows: processed, total_rows: products.length }).eq('id', jobId);
  }
  
  // 5. Cleanup
  await supabase.storage.from('liderpapel-enrichment').remove([storagePath]);
  await supabase.from('enrich_import_jobs').update({ status: 'done' }).eq('id', jobId);
  
  return new Response(JSON.stringify({ jobId }));
});
```

---

## Feature 3 — Table `enrich_import_jobs` pour le suivi de progression

### Migration SQL

```sql
CREATE TABLE public.enrich_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT,
  file_type TEXT, -- 'multimedia_json' | 'descriptions_json' | 'relations_json'
  status TEXT DEFAULT 'pending', -- pending | processing | done | error
  processed_rows INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.enrich_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_jobs" ON public.enrich_import_jobs FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);
```

---

## Feature 4 — Mise à jour de l'UI `AdminComlandi.tsx`

### Nouveau flux UI dans le composant LiderpapelTab

Remplacer la logique actuelle `handleEnrichImport` par :

**Étape 1 — Upload**
```typescript
const { error } = await supabase.storage
  .from('liderpapel-enrichment')
  .upload(`enrich-${Date.now()}-${file.name}`, file, {
    contentType: 'application/json',
    upsert: true,
  });
```
Le navigateur fait juste un PUT — il ne lit pas le fichier. La barre de progression native du navigateur gère l'avancement de l'upload.

**Étape 2 — Déclenchement**
```typescript
const { data } = await supabase.functions.invoke('process-enrich-file', {
  body: { storagePath, fileType: 'multimedia_json' }
});
const jobId = data.jobId;
```

**Étape 3 — Polling**
```typescript
// Poll toutes les 3 secondes
const interval = setInterval(async () => {
  const { data: job } = await supabase
    .from('enrich_import_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  setEnrichProgress(Math.round((job.processed_rows / job.total_rows) * 100));
  if (job.status === 'done' || job.status === 'error') clearInterval(interval);
}, 3000);
```

### Nouveau rendu UI

- **Zone de drop** : 3 boutons d'upload indépendants (Descriptions, Multimedia, RelatedProducts) avec taille du fichier détectée en temps réel
- **Barre de progression upload** : affichage du pourcentage d'upload via `onUploadProgress` (si supporté) ou spinner
- **Barre de progression traitement** : `processed_rows / total_rows` en live via polling
- **Statut par fichier** : badge "En attente", "Upload...", "Traitement...", "✓ Terminé", "✗ Erreur"
- **Suppression** : le fichier Storage est supprimé automatiquement après traitement

---

## Fichiers à créer/modifier

| # | Fichier | Action |
|---|---------|--------|
| 1 | Migration SQL | Créer bucket `liderpapel-enrichment` + table `enrich_import_jobs` |
| 2 | `supabase/functions/process-enrich-file/index.ts` | Nouvelle Edge Function |
| 3 | `supabase/config.toml` | Déclarer `process-enrich-file` |
| 4 | `src/pages/AdminComlandi.tsx` | Remplacer `handleEnrichImport` par le flux upload → poll |
| 5 | `src/integrations/supabase/types.ts` | Typage de `enrich_import_jobs` |

## Ordre d'exécution

1. Migration SQL (bucket + table jobs)
2. Edge Function `process-enrich-file`
3. `supabase/config.toml`
4. UI `AdminComlandi.tsx` (nouveau flux enrichissement)
5. Types Supabase

## Points importants

- **Limite de taille** : Supabase Storage supporte jusqu'à 5GB par fichier — largement suffisant
- **RAM edge function** : ~512MB, suffisant pour parser un JSON de 200MB
- **Timeout** : l'edge function est appelée en mode "fire and forget" — elle tourne en arrière-plan, l'UI poll le statut
- **Fichiers supprimés** : après traitement réussi, les fichiers sont supprimés du Storage pour économiser de l'espace
- **Fichiers tronqués** : le parsing JSON côté serveur bénéficie de la même logique robuste `parseJsonRobust` — si le fichier est tronqué, les produits valides avant la coupure sont récupérés
