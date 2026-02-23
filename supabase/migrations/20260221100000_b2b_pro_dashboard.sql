-- ─────────────────────────────────────────────────────────────────────────────
-- B2B Pro Dashboard — Comptes société, budgets, factures, réassort
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Comptes pro (société) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.b2b_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  siret             TEXT,
  vat_number        TEXT,
  phone             TEXT,
  email             TEXT,
  billing_address   JSONB DEFAULT '{}'::jsonb,
  payment_terms     INTEGER DEFAULT 30,  -- délai paiement en jours
  price_grid_id     UUID REFERENCES public.b2b_price_grids(id) ON DELETE SET NULL,
  is_active         BOOLEAN DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Membres de la société ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.b2b_company_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_primary   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (account_id, user_id)
);

-- ── 3. Budgets annuels ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.b2b_budgets (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id               UUID NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  year                     INTEGER NOT NULL,
  amount                   DECIMAL(12, 2) NOT NULL DEFAULT 0,
  spent_amount             DECIMAL(12, 2) NOT NULL DEFAULT 0,
  alert_threshold_percent  INTEGER NOT NULL DEFAULT 80,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  UNIQUE (account_id, year)
);

-- ── 4. Factures ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.b2b_invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number   TEXT UNIQUE NOT NULL,  -- ex. PRO-2026-001
  account_id       UUID NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  total_ht         DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_ttc        DECIMAL(12, 2) NOT NULL DEFAULT 0,
  issued_at        TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  due_date         DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Séquence pour numérotation des factures
CREATE SEQUENCE IF NOT EXISTS public.b2b_invoice_seq START 1;

-- ── 5. Commandes liées à une facture ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.b2b_invoice_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES public.b2b_invoices(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  amount      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  UNIQUE (invoice_id, order_id)
);

-- ── 6. Templates de réassort ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.b2b_reorder_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         UUID NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT,
  is_auto_generated  BOOLEAN DEFAULT false,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ── 7. Lignes de templates ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.b2b_reorder_template_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES public.b2b_reorder_templates(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Fonction helper : account_id de l'utilisateur connecté
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_b2b_account()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id
  FROM public.b2b_company_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Génère le prochain numéro de facture PRO-YYYY-NNN
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := to_char(now(), 'YYYY');
  v_seq  TEXT;
BEGIN
  v_seq := lpad(nextval('public.b2b_invoice_seq')::TEXT, 3, '0');
  RETURN 'PRO-' || v_year || '-' || v_seq;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.b2b_accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_company_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_budgets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_invoice_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_reorder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_reorder_template_items ENABLE ROW LEVEL SECURITY;

-- b2b_accounts

CREATE POLICY "Membres voient leur société" ON public.b2b_accounts
  FOR SELECT USING (
    id IN (SELECT account_id FROM public.b2b_company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins gèrent les comptes" ON public.b2b_accounts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- b2b_company_users

CREATE POLICY "Membres voient leur équipe" ON public.b2b_company_users
  FOR SELECT USING (
    account_id = public.get_user_b2b_account()
  );

CREATE POLICY "Admin compte peut gérer son équipe" ON public.b2b_company_users
  FOR ALL USING (
    account_id = public.get_user_b2b_account()
    AND EXISTS (
      SELECT 1 FROM public.b2b_company_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins gèrent les membres" ON public.b2b_company_users
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- b2b_budgets

CREATE POLICY "Membres voient le budget" ON public.b2b_budgets
  FOR SELECT USING (account_id = public.get_user_b2b_account());

CREATE POLICY "Admins gèrent les budgets" ON public.b2b_budgets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- b2b_invoices

CREATE POLICY "Membres voient leurs factures" ON public.b2b_invoices
  FOR SELECT USING (account_id = public.get_user_b2b_account());

CREATE POLICY "Admins gèrent les factures" ON public.b2b_invoices
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- b2b_invoice_orders

CREATE POLICY "Membres voient les lignes de factures" ON public.b2b_invoice_orders
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM public.b2b_invoices
      WHERE account_id = public.get_user_b2b_account()
    )
  );

CREATE POLICY "Admins gèrent les lignes de factures" ON public.b2b_invoice_orders
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- b2b_reorder_templates

CREATE POLICY "Membres voient les templates de leur société" ON public.b2b_reorder_templates
  FOR SELECT USING (account_id = public.get_user_b2b_account());

CREATE POLICY "Membres gèrent leurs templates" ON public.b2b_reorder_templates
  FOR INSERT WITH CHECK (account_id = public.get_user_b2b_account());

CREATE POLICY "Membres modifient leurs templates" ON public.b2b_reorder_templates
  FOR UPDATE USING (account_id = public.get_user_b2b_account());

CREATE POLICY "Membres suppriment leurs templates" ON public.b2b_reorder_templates
  FOR DELETE USING (account_id = public.get_user_b2b_account());

CREATE POLICY "Admins gèrent tous les templates" ON public.b2b_reorder_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- b2b_reorder_template_items

CREATE POLICY "Membres voient les items de leurs templates" ON public.b2b_reorder_template_items
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM public.b2b_reorder_templates
      WHERE account_id = public.get_user_b2b_account()
    )
  );

CREATE POLICY "Membres gèrent les items de leurs templates" ON public.b2b_reorder_template_items
  FOR ALL USING (
    template_id IN (
      SELECT id FROM public.b2b_reorder_templates
      WHERE account_id = public.get_user_b2b_account()
    )
  );

CREATE POLICY "Admins gèrent tous les items" ON public.b2b_reorder_template_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers updated_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'b2b_accounts', 'b2b_budgets', 'b2b_invoices', 'b2b_reorder_templates'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t, t
    );
  END LOOP;
END $$;
