-- Migration 005: Add Saved Properties Feature
-- Creates saved_properties table for buyers to bookmark properties

CREATE TABLE IF NOT EXISTS saved_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure user can't save same property twice
    UNIQUE(user_id, property_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_saved_properties_user_id 
    ON saved_properties(user_id);

-- Index for  checking if property is saved
CREATE INDEX IF NOT EXISTS idx_saved_properties_property_id 
    ON saved_properties(property_id);

-- Composite index for user+property lookups
CREATE INDEX IF NOT EXISTS idx_saved_properties_user_property 
    ON saved_properties(user_id, property_id);

COMMENT ON TABLE saved_properties IS 'Buyer saved/bookmarked properties';
COMMENT ON COLUMN saved_properties.notes IS 'Optional buyer notes about the property';
