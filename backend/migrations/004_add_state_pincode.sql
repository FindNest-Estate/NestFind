-- Migration: 004_add_state_pincode.sql
-- Purpose: Add state and pincode columns to properties table
-- Date: 2024-12-31

-- Add state column
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state TEXT;

-- Add pincode column  
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pincode TEXT;

-- Index for pincode searches (common query pattern)
CREATE INDEX IF NOT EXISTS idx_properties_pincode ON properties(pincode) WHERE pincode IS NOT NULL;
