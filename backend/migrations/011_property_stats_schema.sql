-- Property Stats Schema
-- Adds property_views table for view tracking and analytics

-- Property Views Table
-- Tracks unique views with deduplication by user/IP within 24 hours
CREATE TABLE IF NOT EXISTS property_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),  -- IPv6 compatible
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for deduplication queries
    CONSTRAINT property_views_property_fk FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- Index for counting views per property
CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON property_views(property_id);

-- Index for deduplication by viewer
CREATE INDEX IF NOT EXISTS idx_property_views_viewer_dedup ON property_views(property_id, viewer_id, viewed_at);

-- Index for deduplication by IP
CREATE INDEX IF NOT EXISTS idx_property_views_ip_dedup ON property_views(property_id, ip_address, viewed_at);

-- Index for time-based queries (last 7 days, etc.)
CREATE INDEX IF NOT EXISTS idx_property_views_time ON property_views(property_id, viewed_at);


-- Add property_highlights table for additional property attributes
CREATE TABLE IF NOT EXISTS property_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Property highlight fields
    facing VARCHAR(50),           -- North, South, East, West, North-East, etc.
    floor_number INTEGER,         -- Floor number for apartments
    total_floors INTEGER,         -- Total floors in building
    furnishing VARCHAR(50),       -- Unfurnished, Semi-Furnished, Fully Furnished
    possession_date DATE,         -- Expected possession date
    property_age INTEGER,         -- Age in years
    parking_spaces INTEGER,       -- Number of parking spots
    balconies INTEGER,            -- Number of balconies
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_highlights_property ON property_highlights(property_id);


-- Add price_history table for tracking price changes
CREATE TABLE IF NOT EXISTS property_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    old_price DECIMAL(15, 2),
    new_price DECIMAL(15, 2) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_property ON property_price_history(property_id, changed_at DESC);
