-- =========================================================
-- CRM MA-PAPETERIE.FR
-- Schéma SQL complet — Compatible Supabase (PostgreSQL 15+)
-- =========================================================
-- DÉPLOIEMENT :
--   Supabase Dashboard → SQL Editor → New query → coller ce fichier → Run
-- =========================================================

-- Extensions utiles
create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- =========================================================
-- ENUMS
-- =========================================================

do $$ begin
    create type crm_entity_type as enum ('prospect', 'client');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_company_type as enum (
        'entreprise',
        'association',
        'ecole',
        'collectivite',
        'artisan',
        'commerce',
        'profession_libérale',
        'autre'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_prospect_status as enum (
        'a_contacter',
        'contacte',
        'interesse',
        'devis_envoye',
        'client',
        'refus',
        'archive'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_pipeline_stage as enum (
        'a_contacter',
        'contacte',
        'qualification',
        'interesse',
        'devis',
        'negociation',
        'gagne',
        'perdu'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_task_status as enum ('a_faire', 'en_cours', 'terminee', 'annulee');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_task_priority as enum ('basse', 'normale', 'haute', 'urgente');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_task_type as enum (
        'email',
        'appel',
        'relance',
        'rdv',
        'devis',
        'facture',
        'sav',
        'note',
        'autre'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_email_direction as enum ('outbound', 'inbound');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_email_status as enum (
        'draft',
        'queued',
        'sent',
        'delivered',
        'opened',
        'replied',
        'bounced',
        'failed'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_quote_status as enum (
        'brouillon',
        'envoye',
        'accepte',
        'refuse',
        'expire',
        'annule'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_invoice_status as enum (
        'brouillon',
        'emise',
        'envoyee',
        'payee',
        'partiellement_payee',
        'en_retard',
        'annulee'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_ticket_status as enum (
        'ouvert',
        'en_cours',
        'en_attente',
        'resolu',
        'ferme'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_ticket_priority as enum ('basse', 'normale', 'haute', 'critique');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_interaction_type as enum (
        'email',
        'appel',
        'rdv',
        'note',
        'devis',
        'facture',
        'sav',
        'import',
        'ia',
        'autre'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_rgpd_legal_basis as enum (
        'interet_legitime',
        'consentement',
        'contrat',
        'obligation_legale',
        'autre'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
    create type crm_ai_provider as enum ('openai', 'anthropic', 'autre');
exception when duplicate_object then null;
end $$;

-- =========================================================
-- TABLES PRINCIPALES
-- =========================================================

create table if not exists crm_accounts (
    id uuid primary key default gen_random_uuid(),
    name text not null default 'Compte principal',
    timezone text not null default 'Europe/Paris',
    beginner_mode boolean not null default true,
    advanced_mode boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists crm_users (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    email text not null unique,
    full_name text,
    role text not null default 'owner',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists crm_sources (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    name text not null,
    source_type text not null, -- sirene, csv, manual, api, open_data, autre
    provider text,             -- insee, data_gouv, hostinger, n8n...
    is_active boolean not null default true,
    config jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists crm_entities (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,

    entity_type crm_entity_type not null default 'prospect',
    company_type crm_company_type not null default 'entreprise',

    company_name text not null,
    legal_name text,
    display_name text,

    siret varchar(14),
    siren varchar(9),
    vat_number text,
    naf_code text,
    naf_label text,

    email text,
    phone text,
    mobile text,

    address_line1 text,
    address_line2 text,
    postal_code text,
    city text,
    country text not null default 'France',

    latitude numeric(10,7),
    longitude numeric(10,7),
    distance_km numeric(8,2),

    radius_origin_lat numeric(10,7),
    radius_origin_lng numeric(10,7),
    within_target_radius boolean not null default true,

    website text,
    notes text,

    status crm_prospect_status not null default 'a_contacter',
    pipeline_stage crm_pipeline_stage not null default 'a_contacter',
    score integer not null default 0 check (score >= 0 and score <= 100),
    temperature text default 'froid', -- froid, tiede, chaud

    source_id uuid references crm_sources(id) on delete set null,
    source_label text,
    import_batch_id uuid,
    external_ref text,

    first_contact_at timestamptz,
    last_contact_at timestamptz,
    last_incoming_at timestamptz,
    last_outgoing_at timestamptz,

    is_duplicate boolean not null default false,
    duplicate_of_entity_id uuid references crm_entities(id) on delete set null,

    is_blacklisted boolean not null default false,
    blacklist_reason text,

    rgpd_legal_basis crm_rgpd_legal_basis not null default 'interet_legitime',
    rgpd_collected_at timestamptz,
    rgpd_retention_until timestamptz,
    rgpd_opt_out boolean not null default false,
    rgpd_opt_out_at timestamptz,
    rgpd_source_notice text,

    created_by uuid references crm_users(id) on delete set null,
    updated_by uuid references crm_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint crm_entities_siret_chk check (siret is null or siret ~ '^[0-9]{14}$'),
    constraint crm_entities_siren_chk check (siren is null or siren ~ '^[0-9]{9}$')
);

create index if not exists idx_crm_entities_account_id on crm_entities(account_id);
create index if not exists idx_crm_entities_entity_type on crm_entities(entity_type);
create index if not exists idx_crm_entities_status on crm_entities(status);
create index if not exists idx_crm_entities_pipeline_stage on crm_entities(pipeline_stage);
create index if not exists idx_crm_entities_city on crm_entities(city);
create index if not exists idx_crm_entities_postal_code on crm_entities(postal_code);
create index if not exists idx_crm_entities_score on crm_entities(score desc);
create index if not exists idx_crm_entities_source_id on crm_entities(source_id);
create index if not exists idx_crm_entities_import_batch_id on crm_entities(import_batch_id);
create index if not exists idx_crm_entities_siret on crm_entities(siret);
create index if not exists idx_crm_entities_siren on crm_entities(siren);
create index if not exists idx_crm_entities_email on crm_entities(lower(email));
create index if not exists idx_crm_entities_company_name_search on crm_entities using gin (to_tsvector('simple', coalesce(company_name,'')));

create unique index if not exists uq_crm_entities_account_siret
on crm_entities(account_id, siret)
where siret is not null and is_duplicate = false;

create table if not exists crm_contacts (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid not null references crm_entities(id) on delete cascade,

    first_name text,
    last_name text,
    full_name text,
    job_title text,
    department text,

    email text,
    phone text,
    mobile text,

    is_primary boolean not null default false,
    is_decision_maker boolean not null default false,
    notes text,

    rgpd_opt_out boolean not null default false,
    rgpd_opt_out_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_crm_contacts_entity_id on crm_contacts(entity_id);
create index if not exists idx_crm_contacts_email on crm_contacts(lower(email));

create table if not exists crm_tags (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    name text not null,
    color text,
    created_at timestamptz not null default now(),
    unique(account_id, name)
);

create table if not exists crm_entity_tags (
    entity_id uuid not null references crm_entities(id) on delete cascade,
    tag_id uuid not null references crm_tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (entity_id, tag_id)
);

create table if not exists crm_pipelines (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    name text not null,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists crm_pipeline_stages (
    id uuid primary key default gen_random_uuid(),
    pipeline_id uuid not null references crm_pipelines(id) on delete cascade,
    code crm_pipeline_stage not null,
    label text not null,
    position integer not null,
    probability integer not null default 0 check (probability >= 0 and probability <= 100),
    is_won boolean not null default false,
    is_lost boolean not null default false,
    created_at timestamptz not null default now(),
    unique(pipeline_id, code),
    unique(pipeline_id, position)
);

create table if not exists crm_opportunities (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid not null references crm_entities(id) on delete cascade,
    pipeline_id uuid references crm_pipelines(id) on delete set null,
    stage_id uuid references crm_pipeline_stages(id) on delete set null,

    title text not null,
    description text,

    estimated_amount numeric(12,2) not null default 0,
    probability integer not null default 0 check (probability >= 0 and probability <= 100),
    expected_close_date date,

    status crm_pipeline_stage not null default 'a_contacter',
    lost_reason text,
    won_at timestamptz,
    lost_at timestamptz,

    source_label text,
    created_by uuid references crm_users(id) on delete set null,
    assigned_to uuid references crm_users(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_crm_opportunities_entity_id on crm_opportunities(entity_id);
create index if not exists idx_crm_opportunities_status on crm_opportunities(status);
create index if not exists idx_crm_opportunities_expected_close_date on crm_opportunities(expected_close_date);

create table if not exists crm_tasks (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid references crm_entities(id) on delete cascade,
    contact_id uuid references crm_contacts(id) on delete set null,
    opportunity_id uuid references crm_opportunities(id) on delete set null,

    title text not null,
    description text,
    task_type crm_task_type not null default 'autre',
    status crm_task_status not null default 'a_faire',
    priority crm_task_priority not null default 'normale',

    due_at timestamptz,
    completed_at timestamptz,

    assigned_to uuid references crm_users(id) on delete set null,
    created_by uuid references crm_users(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_crm_tasks_entity_id on crm_tasks(entity_id);
create index if not exists idx_crm_tasks_status on crm_tasks(status);
create index if not exists idx_crm_tasks_due_at on crm_tasks(due_at);

create table if not exists crm_events (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid references crm_entities(id) on delete cascade,
    contact_id uuid references crm_contacts(id) on delete set null,
    opportunity_id uuid references crm_opportunities(id) on delete set null,

    title text not null,
    description text,
    starts_at timestamptz not null,
    ends_at timestamptz,
    location text,
    event_type text default 'rdv',
    created_by uuid references crm_users(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_crm_events_starts_at on crm_events(starts_at);
create index if not exists idx_crm_events_entity_id on crm_events(entity_id);

create table if not exists crm_notes (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid references crm_entities(id) on delete cascade,
    contact_id uuid references crm_contacts(id) on delete cascade,
    opportunity_id uuid references crm_opportunities(id) on delete cascade,
    task_id uuid references crm_tasks(id) on delete cascade,

    body text not null,
    is_pinned boolean not null default false,
    created_by uuid references crm_users(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_crm_notes_entity_id on crm_notes(entity_id);

create table if not exists crm_documents (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid references crm_entities(id) on delete cascade,
    opportunity_id uuid references crm_opportunities(id) on delete cascade,
    quote_id uuid,
    invoice_id uuid,
    ticket_id uuid,

    name text not null,
    file_path text not null,
    mime_type text,
    file_size bigint,
    document_type text,
    metadata jsonb not null default '{}'::jsonb,

    uploaded_by uuid references crm_users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_crm_documents_entity_id on crm_documents(entity_id);

create table if not exists crm_email_accounts (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    label text not null,
    email text not null,
    smtp_host text not null,
    smtp_port integer not null,
    smtp_secure boolean not null default true,
    smtp_username text not null,
    smtp_password_encrypted text not null,
    imap_host text not null,
    imap_port integer not null,
    imap_secure boolean not null default true,
    imap_username text not null,
    imap_password_encrypted text not null,
    is_default boolean not null default false,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists crm_email_templates (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    name text not null,
    subject_template text not null,
    body_template text not null,
    purpose text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists crm_emails (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid references crm_entities(id) on delete cascade,
    contact_id uuid references crm_contacts(id) on delete set null,
    opportunity_id uuid references crm_opportunities(id) on delete set null,
    email_account_id uuid references crm_email_accounts(id) on delete set null,
    template_id uuid references crm_email_templates(id) on delete set null,

    direction crm_email_direction not null,
    status crm_email_status not null default 'draft',

    subject text not null,
    body_text text,
    body_html text,

    from_email text,
    to_email text,
    cc_email text,
    bcc_email text,

    provider_message_id text,
    provider_thread_id text,

    sent_at timestamptz,
    delivered_at timestamptz,
    opened_at timestamptz,
    replied_at timestamptz,
    failed_at timestamptz,
    error_message text,

    created_by uuid references crm_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_crm_emails_entity_id on crm_emails(entity_id);
create index if not exists idx_crm_emails_status on crm_emails(status);
create index if not exists idx_crm_emails_sent_at on crm_emails(sent_at);

create table if not exists crm_interactions (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid references crm_entities(id) on delete cascade,
    contact_id uuid references crm_contacts(id) on delete set null,
    opportunity_id uuid references crm_opportunities(id) on delete set null,
    task_id uuid references crm_tasks(id) on delete set null,
    email_id uuid references crm_emails(id) on delete set null,

    interaction_type crm_interaction_type not null,
    title text,
    content text,
    interaction_at timestamptz not null default now(),

    created_by uuid references crm_users(id) on delete set null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_crm_interactions_entity_id on crm_interactions(entity_id);
create index if not exists idx_crm_interactions_interaction_at on crm_interactions(interaction_at desc);

create table if not exists crm_products (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,

    sku text,
    name text not null,
    category text,
    description text,

    unit text default 'u',
    unit_price_ht numeric(12,2) not null default 0,
    vat_rate numeric(5,2) not null default 20.00,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uq_crm_products_account_sku
on crm_products(account_id, sku)
where sku is not null;

create table if not exists crm_quotes (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid not null references crm_entities(id) on delete restrict,
    contact_id uuid references crm_contacts(id) on delete set null,
    opportunity_id uuid references crm_opportunities(id) on delete set null,

    quote_number text not null,
    status crm_quote_status not null default 'brouillon',

    issue_date date not null default current_date,
    expiry_date date,

    currency text not null default 'EUR',
    subtotal_ht numeric(12,2) not null default 0,
    total_vat numeric(12,2) not null default 0,
    total_ttc numeric(12,2) not null default 0,

    notes text,
    terms text,
    pdf_path text,

    accepted_at timestamptz,
    refused_at timestamptz,

    created_by uuid references crm_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique(account_id, quote_number)
);

create index if not exists idx_crm_quotes_entity_id on crm_quotes(entity_id);
create index if not exists idx_crm_quotes_status on crm_quotes(status);

create table if not exists crm_quote_items (
    id uuid primary key default gen_random_uuid(),
    quote_id uuid not null references crm_quotes(id) on delete cascade,
    product_id uuid references crm_products(id) on delete set null,

    position integer not null default 1,
    label text not null,
    description text,
    quantity numeric(12,2) not null default 1,
    unit_price_ht numeric(12,2) not null default 0,
    vat_rate numeric(5,2) not null default 20.00,

    line_total_ht numeric(12,2) generated always as (round(quantity * unit_price_ht, 2)) stored,
    created_at timestamptz not null default now()
);

create table if not exists crm_invoices (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid not null references crm_entities(id) on delete restrict,
    contact_id uuid references crm_contacts(id) on delete set null,
    quote_id uuid references crm_quotes(id) on delete set null,

    invoice_number text not null,
    status crm_invoice_status not null default 'brouillon',

    issue_date date not null default current_date,
    due_date date,

    currency text not null default 'EUR',
    subtotal_ht numeric(12,2) not null default 0,
    total_vat numeric(12,2) not null default 0,
    total_ttc numeric(12,2) not null default 0,
    amount_paid numeric(12,2) not null default 0,

    notes text,
    pdf_path text,
    paid_at timestamptz,

    created_by uuid references crm_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique(account_id, invoice_number)
);

create index if not exists idx_crm_invoices_entity_id on crm_invoices(entity_id);
create index if not exists idx_crm_invoices_status on crm_invoices(status);

create table if not exists crm_invoice_items (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references crm_invoices(id) on delete cascade,
    product_id uuid references crm_products(id) on delete set null,

    position integer not null default 1,
    label text not null,
    description text,
    quantity numeric(12,2) not null default 1,
    unit_price_ht numeric(12,2) not null default 0,
    vat_rate numeric(5,2) not null default 20.00,

    line_total_ht numeric(12,2) generated always as (round(quantity * unit_price_ht, 2)) stored,
    created_at timestamptz not null default now()
);

create table if not exists crm_payments (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    invoice_id uuid not null references crm_invoices(id) on delete cascade,

    payment_date date not null default current_date,
    amount numeric(12,2) not null check (amount >= 0),
    payment_method text,
    reference text,
    notes text,

    created_at timestamptz not null default now()
);

create index if not exists idx_crm_payments_invoice_id on crm_payments(invoice_id);

create table if not exists crm_tickets (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid references crm_entities(id) on delete set null,
    contact_id uuid references crm_contacts(id) on delete set null,
    opportunity_id uuid references crm_opportunities(id) on delete set null,

    ticket_number text not null,
    subject text not null,
    description text,

    status crm_ticket_status not null default 'ouvert',
    priority crm_ticket_priority not null default 'normale',

    opened_at timestamptz not null default now(),
    resolved_at timestamptz,
    closed_at timestamptz,

    assigned_to uuid references crm_users(id) on delete set null,
    created_by uuid references crm_users(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique(account_id, ticket_number)
);

create index if not exists idx_crm_tickets_entity_id on crm_tickets(entity_id);
create index if not exists idx_crm_tickets_status on crm_tickets(status);

create table if not exists crm_ticket_messages (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references crm_tickets(id) on delete cascade,
    author_type text not null default 'internal',
    author_name text,
    message text not null,
    is_private boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists crm_import_batches (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    source_id uuid references crm_sources(id) on delete set null,
    batch_name text,
    file_name text,
    total_rows integer not null default 0,
    imported_rows integer not null default 0,
    failed_rows integer not null default 0,
    duplicate_rows integer not null default 0,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    metadata jsonb not null default '{}'::jsonb
);

create table if not exists crm_import_errors (
    id uuid primary key default gen_random_uuid(),
    batch_id uuid not null references crm_import_batches(id) on delete cascade,
    row_number integer,
    raw_data jsonb,
    error_message text not null,
    created_at timestamptz not null default now()
);

create table if not exists crm_rgpd_log (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid references crm_entities(id) on delete set null,
    contact_id uuid references crm_contacts(id) on delete set null,

    action text not null,
    details jsonb not null default '{}'::jsonb,
    performed_by uuid references crm_users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_crm_rgpd_log_entity_id on crm_rgpd_log(entity_id);

create table if not exists crm_ai_models (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    provider crm_ai_provider not null,
    model_name text not null,
    is_active boolean not null default true,
    is_default boolean not null default false,
    config jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists crm_ai_logs (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references crm_accounts(id) on delete cascade,
    entity_id uuid references crm_entities(id) on delete set null,
    contact_id uuid references crm_contacts(id) on delete set null,
    opportunity_id uuid references crm_opportunities(id) on delete set null,
    task_id uuid references crm_tasks(id) on delete set null,

    ai_model_id uuid references crm_ai_models(id) on delete set null,
    provider crm_ai_provider,
    model_name text,

    prompt text not null,
    response text,
    prompt_tokens integer,
    completion_tokens integer,
    total_tokens integer,
    cost_estimate numeric(12,6),

    purpose text,
    status text default 'success',
    error_message text,

    created_by uuid references crm_users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_crm_ai_logs_entity_id on crm_ai_logs(entity_id);
create index if not exists idx_crm_ai_logs_created_at on crm_ai_logs(created_at desc);

create table if not exists crm_settings (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null unique references crm_accounts(id) on delete cascade,

    target_city text not null default 'Chaumont',
    target_lat numeric(10,7) not null default 48.111338,
    target_lng numeric(10,7) not null default 5.138481,
    target_radius_km numeric(8,2) not null default 20.00,

    company_name text,
    company_email text,
    company_phone text,

    quote_prefix text not null default 'DEV',
    invoice_prefix text not null default 'FAC',
    ticket_prefix text not null default 'SAV',

    retention_prospect_months integer not null default 36,
    retention_logs_months integer not null default 36,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- =========================================================
-- VUES UTILES
-- =========================================================

create or replace view crm_v_pipeline_summary as
select
    account_id,
    pipeline_stage,
    count(*) as total_entities,
    avg(score)::numeric(10,2) as avg_score
from crm_entities
where is_duplicate = false
group by account_id, pipeline_stage;

create or replace view crm_v_sales_summary as
select
    account_id,
    count(*) filter (where status = 'payee') as invoices_paid,
    count(*) filter (where status = 'en_retard') as invoices_overdue,
    coalesce(sum(total_ttc) filter (where status in ('emise','envoyee','payee','partiellement_payee','en_retard')), 0) as billed_total,
    coalesce(sum(amount_paid), 0) as collected_total
from crm_invoices
group by account_id;

-- =========================================================
-- FONCTIONS UTILES
-- =========================================================

create or replace function crm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function crm_generate_number(prefix text)
returns text
language plpgsql
as $$
declare
    v_number text;
begin
    v_number := prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random() * 99999) + 1)::text, 5, '0');
    return v_number;
end;
$$;

create or replace function crm_compute_distance_km(
    lat1 numeric,
    lon1 numeric,
    lat2 numeric,
    lon2 numeric
)
returns numeric
language sql
immutable
as $$
    select round((
        6371 * acos(
            least(1, greatest(-1,
                cos(radians(lat1)) * cos(radians(lat2)) *
                cos(radians(lon2) - radians(lon1)) +
                sin(radians(lat1)) * sin(radians(lat2))
            ))
        )
    )::numeric, 2);
$$;

create or replace function crm_refresh_entity_distance()
returns trigger
language plpgsql
as $$
declare
    v_lat numeric;
    v_lng numeric;
    v_radius numeric;
begin
    select target_lat, target_lng, target_radius_km
      into v_lat, v_lng, v_radius
    from crm_settings
    where account_id = new.account_id;

    if new.latitude is not null and new.longitude is not null and v_lat is not null and v_lng is not null then
        new.distance_km := crm_compute_distance_km(new.latitude, new.longitude, v_lat, v_lng);
        new.radius_origin_lat := v_lat;
        new.radius_origin_lng := v_lng;
        new.within_target_radius := (new.distance_km <= v_radius);
    end if;

    return new;
end;
$$;

create or replace function crm_update_entity_contact_dates()
returns trigger
language plpgsql
as $$
begin
    if new.direction = 'outbound' then
        update crm_entities
        set last_outgoing_at = coalesce(new.sent_at, now()),
            last_contact_at = coalesce(new.sent_at, now()),
            updated_at = now()
        where id = new.entity_id;
    elsif new.direction = 'inbound' then
        update crm_entities
        set last_incoming_at = coalesce(new.sent_at, now()),
            last_contact_at = coalesce(new.sent_at, now()),
            updated_at = now()
        where id = new.entity_id;
    end if;

    return new;
end;
$$;

create or replace function crm_set_retention_until()
returns trigger
language plpgsql
as $$
declare
    v_months integer;
begin
    if new.rgpd_collected_at is null then
        new.rgpd_collected_at := now();
    end if;

    select retention_prospect_months
      into v_months
    from crm_settings
    where account_id = new.account_id;

    if v_months is null then
        v_months := 36;
    end if;

    new.rgpd_retention_until := new.rgpd_collected_at + make_interval(months => v_months);
    return new;
end;
$$;

-- =========================================================
-- TRIGGERS
-- =========================================================

drop trigger if exists trg_crm_accounts_updated_at on crm_accounts;
create trigger trg_crm_accounts_updated_at
before update on crm_accounts
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_users_updated_at on crm_users;
create trigger trg_crm_users_updated_at
before update on crm_users
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_sources_updated_at on crm_sources;
create trigger trg_crm_sources_updated_at
before update on crm_sources
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_entities_updated_at on crm_entities;
create trigger trg_crm_entities_updated_at
before update on crm_entities
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_entities_distance on crm_entities;
create trigger trg_crm_entities_distance
before insert or update of latitude, longitude, account_id on crm_entities
for each row execute function crm_refresh_entity_distance();

drop trigger if exists trg_crm_entities_retention on crm_entities;
create trigger trg_crm_entities_retention
before insert or update of rgpd_collected_at, account_id on crm_entities
for each row execute function crm_set_retention_until();

drop trigger if exists trg_crm_contacts_updated_at on crm_contacts;
create trigger trg_crm_contacts_updated_at
before update on crm_contacts
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_pipelines_updated_at on crm_pipelines;
create trigger trg_crm_pipelines_updated_at
before update on crm_pipelines
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_opportunities_updated_at on crm_opportunities;
create trigger trg_crm_opportunities_updated_at
before update on crm_opportunities
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_tasks_updated_at on crm_tasks;
create trigger trg_crm_tasks_updated_at
before update on crm_tasks
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_events_updated_at on crm_events;
create trigger trg_crm_events_updated_at
before update on crm_events
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_notes_updated_at on crm_notes;
create trigger trg_crm_notes_updated_at
before update on crm_notes
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_email_accounts_updated_at on crm_email_accounts;
create trigger trg_crm_email_accounts_updated_at
before update on crm_email_accounts
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_email_templates_updated_at on crm_email_templates;
create trigger trg_crm_email_templates_updated_at
before update on crm_email_templates
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_emails_updated_at on crm_emails;
create trigger trg_crm_emails_updated_at
before update on crm_emails
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_emails_update_entity_dates on crm_emails;
create trigger trg_crm_emails_update_entity_dates
after insert on crm_emails
for each row execute function crm_update_entity_contact_dates();

drop trigger if exists trg_crm_products_updated_at on crm_products;
create trigger trg_crm_products_updated_at
before update on crm_products
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_quotes_updated_at on crm_quotes;
create trigger trg_crm_quotes_updated_at
before update on crm_quotes
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_invoices_updated_at on crm_invoices;
create trigger trg_crm_invoices_updated_at
before update on crm_invoices
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_tickets_updated_at on crm_tickets;
create trigger trg_crm_tickets_updated_at
before update on crm_tickets
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_ai_models_updated_at on crm_ai_models;
create trigger trg_crm_ai_models_updated_at
before update on crm_ai_models
for each row execute function crm_set_updated_at();

drop trigger if exists trg_crm_settings_updated_at on crm_settings;
create trigger trg_crm_settings_updated_at
before update on crm_settings
for each row execute function crm_set_updated_at();

-- =========================================================
-- DONNÉES DE DÉMARRAGE
-- =========================================================

insert into crm_accounts (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Compte principal')
on conflict do nothing;

insert into crm_settings (
    account_id,
    company_name,
    target_city,
    target_lat,
    target_lng,
    target_radius_km
)
values (
    '11111111-1111-1111-1111-111111111111',
    'ma-papeterie.fr',
    'Chaumont',
    48.111338,
    5.138481,
    20.00
)
on conflict (account_id) do nothing;

insert into crm_pipelines (id, account_id, name, is_default)
values (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Pipeline principal',
    true
)
on conflict do nothing;

insert into crm_pipeline_stages (pipeline_id, code, label, position, probability, is_won, is_lost)
values
('22222222-2222-2222-2222-222222222222', 'a_contacter',  'À contacter',  1, 5,   false, false),
('22222222-2222-2222-2222-222222222222', 'contacte',     'Contacté',     2, 15,  false, false),
('22222222-2222-2222-2222-222222222222', 'qualification','Qualification', 3, 30,  false, false),
('22222222-2222-2222-2222-222222222222', 'interesse',    'Intéressé',    4, 50,  false, false),
('22222222-2222-2222-2222-222222222222', 'devis',        'Devis',        5, 70,  false, false),
('22222222-2222-2222-2222-222222222222', 'negociation',  'Négociation',  6, 85,  false, false),
('22222222-2222-2222-2222-222222222222', 'gagne',        'Gagné',        7, 100, true,  false),
('22222222-2222-2222-2222-222222222222', 'perdu',        'Perdu',        8, 0,   false, true)
on conflict do nothing;

insert into crm_products (account_id, sku, name, category, unit, unit_price_ht, vat_rate) values
('11111111-1111-1111-1111-111111111111', 'PAP-001', 'Ramette papier A4 80g (500 feuilles)', 'Papeterie', 'ramette', 4.50, 20.00),
('11111111-1111-1111-1111-111111111111', 'PAP-002', 'Classeur levier A4 dos 8cm', 'Papeterie', 'u', 2.20, 20.00),
('11111111-1111-1111-1111-111111111111', 'PAP-003', 'Stylo bille noir BIC', 'Papeterie', 'u', 0.45, 20.00),
('11111111-1111-1111-1111-111111111111', 'BUR-001', 'Post-it 76x76 jaune (100 feuilles)', 'Fournitures bureau', 'bloc', 2.80, 20.00),
('11111111-1111-1111-1111-111111111111', 'BUR-002', 'Agrafeuse de bureau 24/6', 'Fournitures bureau', 'u', 5.90, 20.00),
('11111111-1111-1111-1111-111111111111', 'IMP-001', 'Impression couleur A4 (par feuille)', 'Impressions', 'u', 0.25, 20.00),
('11111111-1111-1111-1111-111111111111', 'IMP-002', 'Impression N&B A4 (par feuille)', 'Impressions', 'u', 0.08, 20.00),
('11111111-1111-1111-1111-111111111111', 'IMP-003', 'Plastification A4', 'Impressions', 'u', 0.90, 20.00),
('11111111-1111-1111-1111-111111111111', 'IMP-004', 'Reliure thermique', 'Impressions', 'u', 1.50, 20.00),
('11111111-1111-1111-1111-111111111111', 'PHO-001', 'Tirage photo 10x15', 'Services photo', 'u', 0.30, 20.00),
('11111111-1111-1111-1111-111111111111', 'PHO-002', 'Tirage photo A4', 'Services photo', 'u', 2.50, 20.00)
on conflict do nothing;
