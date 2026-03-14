-- ============================================================================
-- Blog Booster Social V2 — Tables préparatoires + améliorations
-- ============================================================================

-- Social accounts: OAuth2 credentials for each platform (V2)
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_name text not null,
  account_id text,                    -- external platform account/page ID
  access_token_ref text,              -- reference to secret vault, NOT the raw token
  refresh_token_ref text,             -- reference to secret vault
  token_expires_at timestamptz,
  scopes text[],
  is_active boolean default false,
  metadata jsonb,                     -- platform-specific data (page name, org name, etc.)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint social_accounts_platform_check check (platform in ('facebook','instagram','x','linkedin')),
  constraint social_accounts_unique_platform unique (platform, account_id)
);

create index if not exists idx_social_accounts_platform on social_accounts(platform);
create index if not exists idx_social_accounts_active on social_accounts(is_active);

-- Generated media: track media assets for social posts (V2)
create table if not exists generated_media (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references social_campaigns(id) on delete cascade,
  post_id uuid references social_posts(id) on delete set null,
  source_type text not null default 'article_image',
  source_url text,
  processed_url text,
  alt_text text,
  width int,
  height int,
  format text,                        -- jpeg, png, webp, etc.
  metadata jsonb,                     -- AI generation params, crop info, etc.
  created_at timestamptz default now(),

  constraint generated_media_source_type_check check (
    source_type in ('article_image','product_image','ai_generated','collection','promotion','service','brand')
  )
);

create index if not exists idx_generated_media_campaign on generated_media(campaign_id);
create index if not exists idx_generated_media_post on generated_media(post_id);
create index if not exists idx_generated_media_source_type on generated_media(source_type);

-- Add retry_count to social_posts
alter table social_posts add column if not exists retry_count int default 0;

-- Enable RLS on new tables
alter table social_accounts enable row level security;
alter table generated_media enable row level security;

-- RLS Policies (admin-only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_accounts_admin_all' AND tablename = 'social_accounts') THEN
    CREATE POLICY "social_accounts_admin_all" ON social_accounts FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'generated_media_admin_all' AND tablename = 'generated_media') THEN
    CREATE POLICY "generated_media_admin_all" ON generated_media FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- Triggers: auto-update updated_at for social_accounts
create or replace function update_social_accounts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists social_accounts_updated_at_trigger on social_accounts;
create trigger social_accounts_updated_at_trigger
before update on social_accounts
for each row execute function update_social_accounts_updated_at();

-- Grants
grant all on social_accounts to service_role;
grant all on generated_media to service_role;
grant select on social_accounts to authenticated;
grant select on generated_media to authenticated;
