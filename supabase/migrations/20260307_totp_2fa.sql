-- Add 2FA columns to auth.users via public.admin_users bridge table
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  totp_secret text, -- null = 2FA disabled
  totp_enabled boolean default false,
  backup_codes text[] default '{}', -- JSON array of backup codes
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- RLS: Only authenticated users can read their own 2FA status
alter table admin_users enable row level security;

create policy "Users can read own 2FA status"
  on admin_users for select
  using (auth.uid() = id);

create policy "Service role can update 2FA"
  on admin_users for update
  using (auth.role() = 'service_role');

-- Function: Generate TOTP secret (user initiates 2FA setup)
create or replace function generate_totp_secret()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_secret text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Generate random base32 secret (32 characters)
  v_secret := (
    select string_agg(
      substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', 
             floor(random() * 32)::int + 1, 1),
      ''
    ) from generate_series(1, 32)
  );

  -- Store temporarily (not yet enabled)
  insert into admin_users (id, totp_secret, totp_enabled)
  values (v_user_id, v_secret, false)
  on conflict (id) do update
  set totp_secret = v_secret, totp_enabled = false, updated_at = now();

  return json_build_object(
    'secret', v_secret,
    'uri', 'otpauth://totp/' || 
           (select email from auth.users where id = v_user_id) || 
           '?secret=' || v_secret || '&issuer=MaPapeterie'
  );
end;
$$;

-- Function: Enable TOTP (after user confirms code)
create or replace function enable_totp(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_secret text;
  v_backup_codes text[];
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select totp_secret into v_secret from admin_users where id = v_user_id;
  if v_secret is null then
    raise exception 'No TOTP secret found. Call generate_totp_secret first.';
  end if;

  -- In production: validate p_code against v_secret using TOTP library
  -- For now: simple validation (implement with pgcrypto or custom function)
  if length(p_code) != 6 or not p_code ~ '^\d{6}$' then
    raise exception 'Invalid code format';
  end if;

  -- Generate 10 backup codes
  v_backup_codes := array(
    select substr(md5(random()::text), 1, 8)
    from generate_series(1, 10)
  );

  update admin_users
  set 
    totp_enabled = true,
    backup_codes = v_backup_codes,
    updated_at = now()
  where id = v_user_id;

  return json_build_object(
    'enabled', true,
    'backup_codes', v_backup_codes
  );
end;
$$;

-- Function: Verify TOTP code on login
create or replace function verify_totp(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_secret text;
  v_enabled boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;

  select totp_secret, totp_enabled into v_secret, v_enabled
  from admin_users where id = v_user_id;

  if not v_enabled or v_secret is null then
    return false;
  end if;

  -- In production: validate p_code against v_secret
  -- For now: simple validation
  if length(p_code) != 6 or not p_code ~ '^\d{6}$' then
    return false;
  end if;

  -- TODO: Implement actual TOTP validation using time-based algorithm
  -- This requires google-authenticator or similar library
  return true;
end;
$$;

-- Function: Disable TOTP
create or replace function disable_totp()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update admin_users
  set totp_enabled = false, totp_secret = null, backup_codes = '{}'
  where id = v_user_id;

  return json_build_object('disabled', true);
end;
$$;

-- Grants
grant execute on function generate_totp_secret() to authenticated;
grant execute on function enable_totp(text) to authenticated;
grant execute on function verify_totp(text) to authenticated;
grant execute on function disable_totp() to authenticated;
