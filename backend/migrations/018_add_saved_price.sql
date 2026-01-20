-- Migration: 018_add_saved_price.sql
-- Purpose: Add saved_price column to track price drops
-- Date: 2026-01-19

ALTER TABLE saved_properties 
ADD COLUMN IF NOT EXISTS saved_price DECIMAL(12, 2);

COMMENT ON COLUMN saved_properties.saved_price IS 'Price of the property at the time it was saved';

-- Optional: Backfill with current price for existing saves (approximate)
-- UPDATE saved_properties sp
-- SET saved_price = p.price
-- FROM properties p
-- WHERE sp.property_id = p.id AND sp.saved_price IS NULL;
