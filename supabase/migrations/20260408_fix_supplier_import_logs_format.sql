-- Supprime la contrainte CHECK trop restrictive sur le format des imports.
-- La contrainte originale n'acceptait que 'csv' | 'xml' | 'json', mais toutes les
-- fonctions d'import utilisent des chaînes descriptives (ex: 'comlandi-catalogue',
-- 'alkor-catalogue', 'softcarrier-tarifs'…) qui violaient silencieusement la contrainte,
-- empêchant tout insert dans supplier_import_logs et vidant le widget dashboard.
ALTER TABLE public.supplier_import_logs
  DROP CONSTRAINT IF EXISTS supplier_import_logs_format_check;
