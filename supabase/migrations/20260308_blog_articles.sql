-- Create blog articles table
create table if not exists blog_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text, -- HTML rich text
  seo_machine_id text, -- ID du job SEO Machine
  seo_machine_status text default 'pending', -- 'pending' | 'completed' | 'error'
  author_id uuid references auth.users(id),
  category text default 'seo', -- 'seo' | 'papeterie' | 'conseils'
  image_url text,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint blog_articles_title_length check (char_length(title) > 0),
  constraint blog_articles_slug_length check (char_length(slug) > 0)
);

create index if not exists idx_blog_articles_published on blog_articles(published_at);
create index if not exists idx_blog_articles_category on blog_articles(category);
create index if not exists idx_blog_articles_slug on blog_articles(slug);
create index if not exists idx_blog_articles_created_at on blog_articles(created_at);

-- Create blog SEO metadata table
create table if not exists blog_seo_metadata (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references blog_articles(id) on delete cascade,
  keywords text[], -- Array of keywords
  target_audience text,
  reading_time int default 5, -- minutes
  word_count int,
  internal_links text[], -- Array of URLs for internal links
  external_links text[], -- Array of external references
  meta_description text,
  og_image_url text,
  created_at timestamp with time zone default now(),

  constraint blog_seo_metadata_word_count check (word_count >= 0),
  constraint blog_seo_metadata_reading_time check (reading_time >= 0)
);

create index if not exists idx_blog_seo_metadata_article_id on blog_seo_metadata(article_id);
create index if not exists idx_blog_seo_metadata_keywords on blog_seo_metadata using gin(keywords);

-- Create blog views table (analytics)
create table if not exists blog_article_views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references blog_articles(id) on delete cascade,
  user_id uuid references auth.users(id),
  view_date timestamp with time zone default now(),
  read_time_seconds int,
  referrer text
);

create index if not exists idx_blog_views_article_id on blog_article_views(article_id);
create index if not exists idx_blog_views_date on blog_article_views(view_date);

-- Create blog comments table
create table if not exists blog_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references blog_articles(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  content text not null,
  is_approved boolean default false,
  created_at timestamp with time zone default now(),

  constraint blog_comments_content_length check (char_length(content) > 0)
);

create index if not exists idx_blog_comments_article_id on blog_comments(article_id);
create index if not exists idx_blog_comments_approved on blog_comments(is_approved);

-- Enable Row Level Security
alter table blog_articles enable row level security;
alter table blog_seo_metadata enable row level security;
alter table blog_article_views enable row level security;
alter table blog_comments enable row level security;

-- RLS Policies (idempotent with DO blocks)
DO $$ BEGIN
  -- Blog articles: Anyone can read published articles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blog_articles_public_select' AND tablename = 'blog_articles') THEN
    CREATE POLICY "blog_articles_public_select" ON blog_articles FOR SELECT USING (published_at IS NOT NULL);
  END IF;

  -- Blog articles: Admins can manage all (including drafts)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blog_articles_admin_all' AND tablename = 'blog_articles') THEN
    CREATE POLICY "blog_articles_admin_all" ON blog_articles FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;

  -- SEO metadata: Anyone can read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blog_seo_public_select' AND tablename = 'blog_seo_metadata') THEN
    CREATE POLICY "blog_seo_public_select" ON blog_seo_metadata FOR SELECT USING (true);
  END IF;

  -- SEO metadata: Admins can manage all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blog_seo_admin_all' AND tablename = 'blog_seo_metadata') THEN
    CREATE POLICY "blog_seo_admin_all" ON blog_seo_metadata FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;

  -- Blog views: Anyone can insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blog_views_public_insert' AND tablename = 'blog_article_views') THEN
    CREATE POLICY "blog_views_public_insert" ON blog_article_views FOR INSERT WITH CHECK (true);
  END IF;

  -- Blog views: Admins can read all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blog_views_admin_select' AND tablename = 'blog_article_views') THEN
    CREATE POLICY "blog_views_admin_select" ON blog_article_views FOR SELECT
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;

  -- Blog comments: Anyone can read approved
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blog_comments_public_select' AND tablename = 'blog_comments') THEN
    CREATE POLICY "blog_comments_public_select" ON blog_comments FOR SELECT USING (is_approved = true);
  END IF;

  -- Blog comments: Anyone can insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blog_comments_public_insert' AND tablename = 'blog_comments') THEN
    CREATE POLICY "blog_comments_public_insert" ON blog_comments FOR INSERT WITH CHECK (true);
  END IF;

  -- Blog comments: Admins can manage all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blog_comments_admin_manage' AND tablename = 'blog_comments') THEN
    CREATE POLICY "blog_comments_admin_manage" ON blog_comments FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- Function: Auto-update updated_at timestamp
create or replace function update_blog_articles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists blog_articles_updated_at_trigger on blog_articles;
create trigger blog_articles_updated_at_trigger
before update on blog_articles
for each row
execute function update_blog_articles_updated_at();

-- Function: Count article views
create or replace function count_article_views(article_id uuid)
returns int as $$
  select count(*)::int
  from blog_article_views
  where blog_article_views.article_id = $1;
$$ language sql stable;

-- Function: Get article stats
create or replace function get_article_stats(article_id uuid)
returns json as $$
  select json_build_object(
    'views', count_article_views(article_id),
    'comments', (
      select count(*)
      from blog_comments
      where blog_comments.article_id = $1 and is_approved = true
    ),
    'word_count', (
      select word_count
      from blog_seo_metadata
      where blog_seo_metadata.article_id = $1
    )
  ) result;
$$ language sql stable;

-- Grant permissions
grant select on blog_articles to anon, authenticated;
grant select on blog_seo_metadata to anon, authenticated;
grant insert on blog_article_views to anon, authenticated;
grant insert, select on blog_comments to anon, authenticated;
grant all on blog_articles to service_role;
grant all on blog_seo_metadata to service_role;
grant all on blog_article_views to service_role;
grant all on blog_comments to service_role;
