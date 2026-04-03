-- Add delivery_cost and shipping_method_name columns to orders table
-- Required for checkout to persist shipping info chosen by the customer

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_method_name text;
