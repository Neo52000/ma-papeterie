-- ─────────────────────────────────────────────────────────────────────────────
-- static_pages — CMS pages statiques boostées IA
-- Rollback : DROP TABLE IF EXISTS static_pages;
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS static_pages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT        UNIQUE NOT NULL,          -- URL: /p/{slug}
  title            TEXT        NOT NULL,                 -- titre affiché
  meta_title       TEXT,                                 -- <title> SEO (≤60 chars)
  meta_description TEXT,                                 -- meta desc (≤160 chars)
  h1               TEXT,                                 -- heading H1 (peut diff du title)
  content          JSONB       NOT NULL DEFAULT '[]',    -- blocs de contenu
  json_ld          JSONB,                                -- Schema.org JSON-LD
  schema_type      TEXT        DEFAULT 'WebPage'
                               CHECK (schema_type IN (
                                 'WebPage','Service','FAQPage',
                                 'Article','LocalBusiness','HowTo'
                               )),
  status           TEXT        DEFAULT 'draft'
                               CHECK (status IN ('draft','published','archived')),
  published_at     TIMESTAMPTZ,
  ai_generated     BOOLEAN     DEFAULT false,
  seo_score        INTEGER     CHECK (seo_score BETWEEN 0 AND 100),
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS static_pages_slug_idx   ON static_pages (slug);
CREATE INDEX IF NOT EXISTS static_pages_status_idx ON static_pages (status);

-- ── Trigger updated_at ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_static_pages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_static_pages_updated_at
  BEFORE UPDATE ON static_pages
  FOR EACH ROW EXECUTE FUNCTION set_static_pages_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

-- Lecture publique des pages publiées
CREATE POLICY "static_pages_public_select"
  ON static_pages FOR SELECT
  USING (status = 'published');

-- Toutes les opérations pour les admins
CREATE POLICY "static_pages_admin_all"
  ON static_pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ── Page de démonstration ─────────────────────────────────────────────────────
INSERT INTO static_pages (slug, title, meta_title, meta_description, h1, schema_type, status, ai_generated, seo_score, content, json_ld)
VALUES (
  'exemple-page-ia',
  'Exemple — Page générée par IA',
  'Exemple Page IA | Ma Papeterie Chaumont',
  'Découvrez comment créer des pages optimisées SEO avec l''assistant IA de Ma Papeterie. Contenu généré automatiquement et modifiable.',
  'Créez des pages optimisées avec l''IA',
  'WebPage',
  'draft',
  true,
  85,
  '[
    {"type":"heading","level":2,"content":"Bienvenue dans le CMS IA"},
    {"type":"paragraph","content":"Cet outil vous permet de créer des pages optimisées pour les moteurs de recherche et les IA comme Google AI Overview ou Perplexity, en quelques secondes."},
    {"type":"list","ordered":false,"items":["Génération de contenu structuré","Schema.org JSON-LD automatique","Score SEO instantané","Modification simple et rapide"]},
    {"type":"faq","questions":[{"q":"Comment fonctionne la génération IA ?","a":"Vous saisissez un résumé de la page et des mots-clés. L''IA génère le titre, la description, les blocs de contenu et le schema JSON-LD adapté."},{"q":"Puis-je modifier le contenu généré ?","a":"Oui, tout le contenu est modifiable directement dans l''éditeur avant publication."}]},
    {"type":"cta","title":"Créer votre première page","description":"Essayez le générateur IA maintenant.","link":"/admin/pages","button":"Accéder au CMS"}
  ]'::jsonb,
  '{"@context":"https://schema.org","@type":"WebPage","name":"Exemple Page IA","description":"Découvrez comment créer des pages optimisées SEO avec l''assistant IA de Ma Papeterie."}'::jsonb
);
