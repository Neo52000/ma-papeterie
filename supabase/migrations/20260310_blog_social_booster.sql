-- ============================================================================
-- Blog Booster Social — Tables, index, RLS, triggers
-- ============================================================================

-- Social campaigns: links a blog article to a social media campaign
create table if not exists social_campaigns (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references blog_articles(id) on delete cascade,
  status text not null default 'detected',
  classification jsonb,       -- {universe, seasonality, need_type, usage, main_angle}
  entity_matches jsonb,       -- [{entity_type, entity_id, entity_label, match_score, match_reason}]
  selected_entity jsonb,      -- {entity_type, entity_id, entity_label} chosen by admin
  utm_params jsonb,           -- {source, medium, campaign}
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint social_campaigns_article_unique unique (article_id),
  constraint social_campaigns_status_check check (
    status in ('detected','classified','generated','draft','approved','scheduled','publishing','published','failed','cancelled')
  )
);

create index if not exists idx_social_campaigns_article on social_campaigns(article_id);
create index if not exists idx_social_campaigns_status on social_campaigns(status);

-- Social posts: one per platform per campaign
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references social_campaigns(id) on delete cascade,
  platform text not null,
  content text not null,
  hashtags text[],
  cta_text text,
  cta_url text,
  media_url text,
  status text not null default 'draft',
  external_post_id text,
  published_at timestamptz,
  scheduled_for timestamptz,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint social_posts_platform_check check (platform in ('facebook','instagram','x','linkedin')),
  constraint social_posts_status_check check (
    status in ('draft','approved','scheduled','publishing','published','failed','skipped')
  ),
  constraint social_posts_unique_per_platform unique (campaign_id, platform)
);

create index if not exists idx_social_posts_campaign on social_posts(campaign_id);
create index if not exists idx_social_posts_platform on social_posts(platform);
create index if not exists idx_social_posts_status on social_posts(status);

-- Publication logs: journal of every action
create table if not exists social_publication_logs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references social_posts(id) on delete cascade,
  action text not null,        -- generate|publish|retry|cancel|approve|skip
  status text not null,        -- success|error
  response_data jsonb,
  error_message text,
  duration_ms int,
  created_at timestamptz default now()
);

create index if not exists idx_social_pub_logs_post on social_publication_logs(post_id);
create index if not exists idx_social_pub_logs_created on social_publication_logs(created_at);

-- Social settings: singleton configuration
create table if not exists social_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean default true,
  active_platforms text[] default '{facebook,instagram,x,linkedin}',
  default_mode text default 'draft',
  default_ctas text[] default '{Découvrez l''article complet,Voir les produits,Découvrez nos services,Préparez votre rentrée,Voir la collection}',
  utm_source text default 'social',
  utm_medium text default 'post',
  utm_campaign_prefix text default 'blog_',
  ai_provider text default 'anthropic',
  ai_model text default 'claude-sonnet-4-20250514',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint social_settings_mode_check check (default_mode in ('draft','approval','auto'))
);

-- Insert default settings row
insert into social_settings (id)
select gen_random_uuid()
where not exists (select 1 from social_settings limit 1);

-- Enable RLS
alter table social_campaigns enable row level security;
alter table social_posts enable row level security;
alter table social_publication_logs enable row level security;
alter table social_settings enable row level security;

-- RLS Policies (admin-only, same pattern as blog_articles)
DO $$ BEGIN
  -- social_campaigns: admin all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_campaigns_admin_all' AND tablename = 'social_campaigns') THEN
    CREATE POLICY "social_campaigns_admin_all" ON social_campaigns FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;

  -- social_posts: admin all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_admin_all' AND tablename = 'social_posts') THEN
    CREATE POLICY "social_posts_admin_all" ON social_posts FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;

  -- social_publication_logs: admin all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_pub_logs_admin_all' AND tablename = 'social_publication_logs') THEN
    CREATE POLICY "social_pub_logs_admin_all" ON social_publication_logs FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;

  -- social_settings: admin all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_settings_admin_all' AND tablename = 'social_settings') THEN
    CREATE POLICY "social_settings_admin_all" ON social_settings FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- Triggers: auto-update updated_at
create or replace function update_social_campaigns_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists social_campaigns_updated_at_trigger on social_campaigns;
create trigger social_campaigns_updated_at_trigger
before update on social_campaigns
for each row execute function update_social_campaigns_updated_at();

create or replace function update_social_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists social_posts_updated_at_trigger on social_posts;
create trigger social_posts_updated_at_trigger
before update on social_posts
for each row execute function update_social_posts_updated_at();

create or replace function update_social_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists social_settings_updated_at_trigger on social_settings;
create trigger social_settings_updated_at_trigger
before update on social_settings
for each row execute function update_social_settings_updated_at();

-- Grants
grant all on social_campaigns to service_role;
grant all on social_posts to service_role;
grant all on social_publication_logs to service_role;
grant all on social_settings to service_role;
grant select on social_campaigns to authenticated;
grant select on social_posts to authenticated;
grant select on social_publication_logs to authenticated;
grant select on social_settings to authenticated;
