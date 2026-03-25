-- Add a machine-readable `code` column to the suppliers table.
-- This replaces the hardcoded SupplierCode enum in the frontend and allows
-- foreign-key-based relationships instead of string matching.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS code VARCHAR(20) UNIQUE;

-- Populate known supplier codes from existing names
UPDATE public.suppliers SET code = 'ALKOR'    WHERE code IS NULL AND name ILIKE '%alkor%';
UPDATE public.suppliers SET code = 'COMLANDI'  WHERE code IS NULL AND (name ILIKE '%comlandi%' OR name ILIKE '%liderpapel%');
UPDATE public.suppliers SET code = 'SOFT'      WHERE code IS NULL AND (name ILIKE '%soft%carrier%' OR name ILIKE '%softcarrier%');
