
-- Add unique constraint on brands.name for upsert support
ALTER TABLE public.brands ADD CONSTRAINT brands_name_key UNIQUE (name);
