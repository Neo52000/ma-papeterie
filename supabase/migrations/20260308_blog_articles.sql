-- Create blog articles table
create table blog_articles (
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

create index idx_blog_articles_published on blog_articles(published_at);
create index idx_blog_articles_category on blog_articles(category);
create index idx_blog_articles_slug on blog_articles(slug);
create index idx_blog_articles_created_at on blog_articles(created_at);

-- Create blog SEO metadata table
create table blog_seo_metadata (
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

create index idx_blog_seo_metadata_article_id on blog_seo_metadata(article_id);
create index idx_blog_seo_metadata_keywords on blog_seo_metadata using gin(keywords);

-- Create blog views table (analytics)
create table blog_article_views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references blog_articles(id) on delete cascade,
  user_id uuid references auth.users(id),
  view_date timestamp with time zone default now(),
  read_time_seconds int,
  referrer text,
  
  index idx_blog_views_article_id (article_id),
  index idx_blog_views_date (view_date)
);

-- Create blog comments table
create table blog_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references blog_articles(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  content text not null,
  is_approved boolean default false,
  created_at timestamp with time zone default now(),
  
  constraint blog_comments_content_length check (char_length(content) > 0)
);

create index idx_blog_comments_article_id on blog_comments(article_id);
create index idx_blog_comments_approved on blog_comments(is_approved);

-- Enable Row Level Security
alter table blog_articles enable row level security;
alter table blog_seo_metadata enable row level security;
alter table blog_article_views enable row level security;
alter table blog_comments enable row level security;

-- Blog articles: Anyone can read published articles
create policy "blog_articles_public_select" on blog_articles
  for select
  using (published_at is not null);

-- Blog articles: Admins can read all (including drafts)
create policy "blog_articles_admin_select" on blog_articles
  for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Blog articles: Authors can read/update their own drafts
create policy "blog_articles_author_manage" on blog_articles
  for all
  using (author_id = auth.uid() or auth.jwt() ->> 'role' = 'admin');

-- Blog articles: Service role can insert/update
create policy "blog_articles_service_role_all" on blog_articles
  for all
  using (auth.jwt() ->> 'role' = 'service_role' or auth.jwt() ->> 'role' = 'admin');

-- SEO metadata: Anyone can read
create policy "blog_seo_public_select" on blog_seo_metadata
  for select
  using (true);

-- Blog views: Anyone can insert
create policy "blog_views_public_insert" on blog_article_views
  for insert
  with check (true);

-- Blog comments: Anyone can read approved
create policy "blog_comments_public_select" on blog_comments
  for select
  using (is_approved = true);

-- Blog comments: Anyone can insert
create policy "blog_comments_public_insert" on blog_comments
  for insert
  with check (true);

-- Blog comments: Admins can manage all
create policy "blog_comments_admin_manage" on blog_comments
  for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Function: Auto-update updated_at timestamp
create or replace function update_blog_articles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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
