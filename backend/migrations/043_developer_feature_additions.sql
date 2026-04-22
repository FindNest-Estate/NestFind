-- ============================================================================
-- Migration 043: Developer Feature Additions
-- NestFind — Professional Builder Portal
-- ============================================================================
-- Adds support for:
--   - Interactive Layout Mapping
--   - Unit Specification Fields (Plots/Villas)
--   - Pricing Rules & Auction Settings
--   - Project Phases (Stage-based selling)
--   - Wizard Step Tracking
-- ============================================================================

-- 1. ENUMS (If needed, check existing first)
-- dev_project_status already exists in 041.
-- dev_unit_status already exists in 041.

-- 2. PROJECT PHASES
CREATE TABLE IF NOT EXISTS dev_project_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,
    phase_name TEXT NOT NULL,
    total_units INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PLANNED', -- PLANNED, ACTIVE, COMPLETED, ON_HOLD
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_phases_project ON dev_project_phases(project_id);

-- 3. LAYOUT MAPPING (Interactive Inventory)
CREATE TABLE IF NOT EXISTS dev_layout_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES dev_units(id) ON DELETE CASCADE,
    
    -- Position & Dimensions
    x INT NOT NULL,
    y INT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    shape_type TEXT NOT NULL DEFAULT 'rect', -- rect, poly (rect handled for now)
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(unit_id) -- One mapping per unit
);

CREATE INDEX idx_dev_layout_project ON dev_layout_units(project_id);

-- 4. ENHANCE DEV_PROJECTS (Pricing & Wizard Tracking)
ALTER TABLE dev_projects
    ADD COLUMN IF NOT EXISTS pricing_rules JSONB DEFAULT '{
        "base_price": 0,
        "floor_rise": 0,
        "corner_plot_premium": 0,
        "east_facing_premium": 0,
        "west_facing_premium": 0,
        "north_facing_premium": 0,
        "south_facing_premium": 0,
        "parking_charges": 0,
        "amenity_charges": 0
    }'::jsonb,
    ADD COLUMN IF NOT EXISTS auction_settings JSONB DEFAULT '{
        "is_auction_mode": false,
        "deadline_hours": 24,
        "min_bid_increment": 1000,
        "auto_accept_threshold_pct": 100
    }'::jsonb,
    ADD COLUMN IF NOT EXISTS current_step INT DEFAULT 1;

-- 5. ENHANCE DEV_UNITS (Detailed Specs)
ALTER TABLE dev_units
    ADD COLUMN IF NOT EXISTS corner_plot BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS land_area DECIMAL(12, 2), -- for plots/villas
    ADD COLUMN IF NOT EXISTS built_up_area DECIMAL(12, 2), -- for villas
    ADD COLUMN IF NOT EXISTS garden_area DECIMAL(12, 2); -- for villas

-- 6. GRANT PERMISSIONS
GRANT ALL PRIVILEGES ON dev_project_phases TO nestfind_user;
GRANT ALL PRIVILEGES ON dev_layout_units TO nestfind_user;
