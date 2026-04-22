-- Migration 021: Add Property Card Fields
-- Adds views_count, original_price, and is_hot_sale to properties table

BEGIN;

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price NUMERIC(14, 2),
ADD COLUMN IF NOT EXISTS is_hot_sale BOOLEAN DEFAULT false;

-- Create an index for hot sales as they might be queried often
CREATE INDEX IF NOT EXISTS idx_properties_hot_sale ON properties(is_hot_sale) WHERE is_hot_sale = true;

COMMIT;
