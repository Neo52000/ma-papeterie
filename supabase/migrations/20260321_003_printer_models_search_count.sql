-- Add search_count to printer_models for tracking popular printers
ALTER TABLE printer_models
ADD COLUMN IF NOT EXISTS search_count integer NOT NULL DEFAULT 0;

-- Index for fast ordering by popularity
CREATE INDEX IF NOT EXISTS idx_printer_models_search_count
ON printer_models (search_count DESC)
WHERE is_active = true AND search_count > 0;

-- RPC function to atomically increment search count
CREATE OR REPLACE FUNCTION increment_printer_search_count(model_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE printer_models
  SET search_count = search_count + 1
  WHERE id = model_id;
$$;
