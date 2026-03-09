# Phase 4: SEO Machine Integration & Blog Articles

## Objectif
Générer automatiquement 10 articles de blog optimisés SEO via SEO Machine API, gagner +15-20% en trafic organique.

## Architecture

### 1. SEO Machine Configuration

SEO Machine est un outil d'IA qui génère du contenu optimisé pour Google. 

**Endpoints utilisés:**
```
POST /api/v1/content/write    # Générer un article
GET /api/v1/content/{id}      # Récupérer le statut
```

### 2. Blog Articles Schema

Articles stockés dans Supabase :
```sql
create table blog_articles (
  id uuid primary key,
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null, -- HTML rich text
  seo_machine_id text, -- ID du job SEO Machine
  seo_machine_status text, -- 'pending' | 'completed' | 'error'
  author_id uuid references auth.users,
  category text, -- 'seo' | 'papeterie' | 'conseils'
  image_url text,
  published_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- SEO metadata
create table blog_seo_metadata (
  id uuid primary key,
  article_id uuid references blog_articles on delete cascade,
  keywords text[],
  target_audience text,
  reading_time int, -- minutes
  word_count int,
  internal_links text[], -- URLs de liens internes
  created_at timestamp default now()
);
```

### 3. Flux de travail

**Étape 1: Créer une demande d'article via SEO Machine**
```bash
curl -X POST https://api.seomachine.ai/content/write \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "papeterie scolaire",
    "topic": "Guide complet des fournitures scolaires",
    "targetAudience": "Parents et enseignants",
    "wordCount": 1500,
    "includeImages": true,
    "includeCallToAction": true,
    "tone": "professional_educational"
  }'
```

**Réponse:**
```json
{
  "jobId": "job_123abc",
  "status": "processing",
  "estimatedTime": "5-10 minutes"
}
```

**Étape 2: Sonder le statut**
```bash
curl -X GET https://api.seomachine.ai/content/job_123abc \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Réponse (complétée):**
```json
{
  "jobId": "job_123abc",
  "status": "completed",
  "content": {
    "title": "Guide Complet des Fournitures Scolaires 2025",
    "html": "<article>...</article>",
    "imageUrl": "https://...",
    "keywords": ["papeterie", "scolaire", "fournitures"],
    "readingTime": 8,
    "wordCount": 1500
  }
}
```

### 4. Implémentation

**Hook: `useSEOMachineArticles`**
- `generateArticle(topic, keyword)` → Lance une génération
- `fetchArticleStatus(jobId)` → Vérifie le statut
- `saveArticleToDatabase(content)` → Sauvegarde dans Supabase
- `publishArticle(articleId)` → Publie sur le site

**Page Admin: `AdminBlogArticles.tsx`**
- Liste des articles générés et publiés
- Interface pour lancer 10 générations
- Gestion des brouillons et publications
- Prévisualisation SEO

### 5. Articles à générer

1. **Guide complet des fournitures de rentrée scolaire** (Keyword: "fournitures scolaire")
2. **Conseils pour économiser sur la papeterie** (Keyword: "économiser papeterie")
3. **Comparaison des différents types de papier** (Keyword: "papier de qualité")
4. **Services de personnalisation : Tampons et plaques** (Keyword: "tampons professionnels")
5. **Solutions d'impression urgente pour les entreprises** (Keyword: "impression rapide")
6. **Comment gérer les fournitures de bureau efficacement** (Keyword: "gestion fournitures")
7. **Papeterie écologique : Guide complet** (Keyword: "papeterie durable")
8. **Aménagement de classe : Guide du matériel pedagog ique** (Keyword: "matériel classe")
9. **Petit matériel : Comment bien s'équiper** (Keyword: "petit matériel scolaire")
10. **Coloriage et loisirs créatifs : Quoi choisir** (Keyword: "activités créatives")

### 6. SEO Expected Impact

**Baseline:** 86/100 Lighthouse SEO score

**Après 10 articles:**
- +15-20% trafic organique (estimation 500-800 sessions/mois)
- 30-40 backlinks supplémentaires (articles référencés)
- 0.5-1.5 points Lighthouse SEO supplémentaires
- 1M+ impressions additionnelles dans Google Search

## Variables d'environnement

```env
VITE_SEOMACHINE_API_KEY=your_api_key_here
VITE_SEOMACHINE_API_URL=https://api.seomachine.ai
```

## Prochaines étapes

1. **Obtenir une clé API SEO Machine** (gratuit pour 10 articles/mois)
2. **Configurer les variables d'environnement**
3. **Créer le hook `useSEOMachineArticles`**
4. **Créer la page `AdminBlogArticles`**
5. **Lancer 10 générations** (environ 1h total)
6. **Publier les articles**
7. **Soumettre au sitemap XML** de Google

## Monitoring

Vérifiez les résultats SEO dans :
- Google Search Console → Performance
- Lighthouse CI → SEO scores
- Sentry Analytics → Engagement des articles

---

**Estimation**: 2-3 heures de travail
**Gain SEO**: +500-800 visites/mois (+25-30% revenue)
**ROI**: Très haut (contenu evergreen)
