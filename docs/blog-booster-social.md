# Blog Booster Social — Documentation

## Description

Module natif intégré au back-office blog de ma-papeterie.fr. Transforme automatiquement les articles du blog en publications promotionnelles multi-réseaux (Facebook, Instagram, X, LinkedIn) via IA générative (Claude API).

## Architecture

```
blog_articles (existant)
       │
       ▼
┌─────────────────────┐     ┌──────────────────┐
│  generate-social-   │────▶│ social_campaigns  │
│  posts (Edge Fn)    │     │ social_posts      │
│  - Classification   │     │ publication_logs  │
│  - Entity matching  │     └──────────────────┘
│  - AI generation    │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  publish-social-    │
│  post (Edge Fn)     │
│  - Mock publishers  │
│  - Status tracking  │
│  - Logging          │
└─────────────────────┘
```

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `supabase/migrations/20260310_blog_social_booster.sql` | Tables, index, RLS, triggers |
| `supabase/functions/generate-social-posts/index.ts` | Classification + matching + génération AI |
| `supabase/functions/publish-social-post/index.ts` | Publication (mock MVP) |
| `supabase/functions/social-settings/index.ts` | CRUD réglages |
| `src/hooks/useSocialBooster.ts` | 10 hooks React Query |
| `src/components/admin/blog/SocialBoosterPanel.tsx` | Panneau détail par article |
| `src/components/admin/blog/SocialSettingsPanel.tsx` | Réglages du module |
| `src/components/admin/blog/SocialCampaignsList.tsx` | Liste campagnes |
| `src/hooks/useSocialBooster.test.ts` | 14 tests |

### Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/AdminBlogArticles.tsx` | Colonne Social, bouton Booster, tabs Campagnes/Réglages |

## Tables de données

### social_campaigns
- `id` (uuid, PK)
- `article_id` (uuid, FK → blog_articles, unique)
- `status` (text) : detected → classified → generated → draft → approved → scheduled → publishing → published / failed / cancelled
- `classification` (jsonb) : {universe, seasonality, need_type, usage, main_angle}
- `entity_matches` (jsonb) : [{entity_type, entity_id, entity_label, match_score, match_reason}]
- `selected_entity` (jsonb) : entité choisie par l'admin
- `utm_params` (jsonb)

### social_posts
- `id` (uuid, PK)
- `campaign_id` (uuid, FK → social_campaigns)
- `platform` (text) : facebook | instagram | x | linkedin
- `content` (text), `hashtags` (text[]), `cta_text`, `cta_url`, `media_url`
- `status` (text) : draft → approved → scheduled → publishing → published / failed / skipped
- `external_post_id` (text), `published_at`, `scheduled_for`, `error_message`
- Contrainte unique : (campaign_id, platform)

### social_publication_logs
- `id`, `post_id` (FK), `action`, `status`, `response_data`, `error_message`, `duration_ms`

### social_settings
- Singleton : enabled, active_platforms, default_mode, default_ctas, utm_*, ai_provider, ai_model

## Guide d'utilisation admin

1. Aller dans `/admin/blog`
2. Dans la liste des articles, repérer la colonne **Social** avec le bouton **Booster**
3. Cliquer **Booster** sur un article publié
4. Cliquer **Générer les posts sociaux** → l'IA classifie l'article et génère 4 posts
5. Voir les **entités métier suggérées** (catégorie, marque, service...) avec score et raison
6. Modifier les textes si besoin via le bouton **Modifier**
7. **Approuver** chaque post individuellement ou en bloc
8. **Publier** les posts approuvés (mode mock en MVP)
9. Consulter les **logs** de chaque tentative
10. Onglet **Campagnes Social** : vue d'ensemble de toutes les campagnes
11. Onglet **Réglages Social** : configurer le module

## Variables d'environnement

### Existantes (réutilisées)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

### Nouvelles (optionnelles, V2)
- `SOCIAL_BASE_URL` : URL de base du site (défaut: `https://ma-papeterie.fr`)
- `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_IG_ACCOUNT_ID`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORGANIZATION_ID`
- `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`

## Limites MVP

- **Publication mock** : les publishers Facebook, Instagram, X et LinkedIn simulent la publication. L'infrastructure (validation, logging, status tracking) est réelle.
- **Pas d'auto-publication** : tout passe par validation manuelle.
- **Pas d'OAuth2** : les tokens sont attendus en variables d'environnement (V2).
- **Pas de génération d'images** : réutilise l'image de l'article.
- **Classification IA** : basée sur le contenu de l'article, pas de matching avec un catalogue produit réel.
- **Pas de scheduler/cron** : la génération est déclenchée manuellement.

## Checklist mise en production

- [ ] Exécuter la migration SQL `20260310_blog_social_booster.sql`
- [ ] Déployer les 3 edge functions (generate-social-posts, publish-social-post, social-settings)
- [ ] Vérifier que `ANTHROPIC_API_KEY` est configurée dans les secrets Supabase
- [ ] Builder et déployer le frontend
- [ ] Tester la génération sur un article existant
- [ ] Vérifier les RLS policies avec un compte admin

## Roadmap V2

- [ ] Publishers réels (Meta Graph API, LinkedIn API, X API v2) avec OAuth2
- [ ] Auto-publication par règles (cron edge function)
- [ ] Variantes A/B par post
- [ ] Analytics de clics (tracking UTM)
- [ ] Rotation intelligente des entités promues
- [ ] Génération d'images IA
- [ ] Carrousels Instagram
- [ ] Republication différée
- [ ] Scoring des angles performants
- [ ] Table `social_accounts` pour multi-comptes
- [ ] Matching avec catalogue produit réel (WooCommerce/PrestaShop)
