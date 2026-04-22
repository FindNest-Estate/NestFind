-- ============================================================================
-- Migration 044: Interactive Visualization Engine
-- NestFind — Real Estate Visualization System
-- ============================================================================
-- Creates tables for:
--   Buildings, Floors, Layout Polygons, Amenities, Roads
-- Extends:
--   dev_units (building_id, coordinates), dev_projects (viewport_config)
--
-- COORDINATE SYSTEM:
--   All coordinates are NORMALIZED (0.0 to 1.0) relative to the master plan
--   viewport. This ensures layouts render correctly on any screen size.
--   Formula: normalizedX = x / layoutWidth, normalizedY = y / layoutHeight
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE polygon_element_type AS ENUM (
        'PLOT', 'ROAD', 'PARK', 'AMENITY', 'BOUNDARY',
        'BUILDING_FOOTPRINT', 'CLUBHOUSE', 'PARKING', 'WATER_BODY', 'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE amenity_type AS ENUM (
        'PARK', 'CLUBHOUSE', 'SWIMMING_POOL', 'GYM', 'PLAYGROUND',
        'COMMUNITY_HALL', 'SHOPPING', 'TEMPLE', 'SCHOOL',
        'HOSPITAL', 'PARKING', 'GATE', 'WATER_TANK', 'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- DEV_BUILDINGS — Buildings/Towers within a project
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,

    -- Identity
    building_name TEXT NOT NULL,              -- "Tower A", "Block B"
    building_code TEXT,                       -- Short code: "TA", "BB"

    -- Position on master plan (normalized 0-1)
    position_x DECIMAL(8, 6) DEFAULT 0.5,
    position_y DECIMAL(8, 6) DEFAULT 0.5,

    -- Structure
    total_floors INT NOT NULL DEFAULT 1,
    units_per_floor INT DEFAULT 4,
    ground_floor_label TEXT DEFAULT 'Ground',  -- "Ground", "Stilt", "G"

    -- Visuals
    model_url TEXT,                           -- GLB/GLTF 3D model URL
    facade_image TEXT,                        -- 2D facade image URL
    facing TEXT DEFAULT 'NORTH',              -- Primary facing direction

    -- Metadata
    status TEXT NOT NULL DEFAULT 'ACTIVE',    -- ACTIVE, UPCOMING, COMPLETED
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Soft delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(project_id, building_name)
);

CREATE INDEX idx_dev_buildings_project ON dev_buildings(project_id);
CREATE INDEX idx_dev_buildings_active ON dev_buildings(project_id) WHERE is_deleted = FALSE;

-- ----------------------------------------------------------------------------
-- DEV_FLOORS — Floors within a building
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES dev_buildings(id) ON DELETE CASCADE,

    floor_number INT NOT NULL,               -- 0 = ground, 1 = first, etc.
    floor_label TEXT,                        -- "Ground Floor", "1st Floor", "Terrace"

    -- Floor plan
    layout_image TEXT,                       -- Floor plan image URL
    layout_svg TEXT,                         -- SVG floor plan data

    -- Unit count
    total_units INT NOT NULL DEFAULT 0,

    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(building_id, floor_number)
);

CREATE INDEX idx_dev_floors_building ON dev_floors(building_id);

-- ----------------------------------------------------------------------------
-- DEV_LAYOUT_POLYGONS — All spatial elements on the master plan
-- Core table for the interactive map. Every plot, road, park, amenity,
-- building footprint is stored as a polygon with normalized coordinates.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_layout_polygons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,

    -- Type & Identity
    polygon_type polygon_element_type NOT NULL,
    label TEXT,                              -- "P101", "Main Road", "Central Park"
    layer_name TEXT,                         -- Source CAD layer: "PLOTS", "ROADS"

    -- Geometry (normalized 0-1 coordinates)
    -- Array of [x, y] pairs: [[0.24, 0.22], [0.30, 0.22], [0.30, 0.28], ...]
    coordinates JSONB NOT NULL,

    -- Visual styling overrides
    style JSONB DEFAULT '{}'::jsonb,         -- {fill, stroke, strokeWidth, opacity}

    -- Physical properties
    area_sqft DECIMAL(12, 2),
    area_label TEXT,                         -- "200 sq yards", "1200 sqft"

    -- Links
    linked_unit_id UUID REFERENCES dev_units(id) ON DELETE SET NULL,
    linked_building_id UUID REFERENCES dev_buildings(id) ON DELETE SET NULL,

    -- Sort order (for rendering z-index)
    z_order INT DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Soft delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_polygons_project ON dev_layout_polygons(project_id);
CREATE INDEX idx_dev_polygons_type ON dev_layout_polygons(polygon_type);
CREATE INDEX idx_dev_polygons_unit ON dev_layout_polygons(linked_unit_id);
CREATE INDEX idx_dev_polygons_building ON dev_layout_polygons(linked_building_id);
CREATE INDEX idx_dev_polygons_active ON dev_layout_polygons(project_id) WHERE is_deleted = FALSE;

-- ----------------------------------------------------------------------------
-- DEV_AMENITIES — Named amenities within a project
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,

    amenity_type amenity_type NOT NULL,
    name TEXT NOT NULL,                      -- "Central Park", "Clubhouse"
    description TEXT,

    -- Position on master plan (normalized 0-1)
    position_x DECIMAL(8, 6),
    position_y DECIMAL(8, 6),

    -- Optional polygon reference for shape
    polygon_id UUID REFERENCES dev_layout_polygons(id) ON DELETE SET NULL,

    -- Icon
    icon TEXT DEFAULT 'MapPin',              -- Lucide icon name

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_amenities_project ON dev_amenities(project_id);

-- ----------------------------------------------------------------------------
-- DEV_ROADS — Road paths within the master plan
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_roads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,

    road_name TEXT,                          -- "Main Road", "Internal Road 1"
    road_type TEXT DEFAULT 'INTERNAL',       -- MAIN, INTERNAL, PATHWAY

    -- Path points (normalized 0-1 coordinates, ordered)
    path_points JSONB NOT NULL,              -- [[x,y], [x,y], ...]
    width DECIMAL(8, 6) DEFAULT 0.02,        -- Normalized width

    -- Optional polygon reference
    polygon_id UUID REFERENCES dev_layout_polygons(id) ON DELETE SET NULL,

    -- Styling
    style JSONB DEFAULT '{"fill": "#94a3b8", "stroke": "#64748b"}'::jsonb,

    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_roads_project ON dev_roads(project_id);

-- ----------------------------------------------------------------------------
-- EXTEND DEV_PROJECTS — Add visualization config
-- ----------------------------------------------------------------------------

ALTER TABLE dev_projects
    ADD COLUMN IF NOT EXISTS master_plan_type TEXT DEFAULT 'IMAGE',  -- IMAGE, SVG, CAD
    ADD COLUMN IF NOT EXISTS viewport_config JSONB DEFAULT '{
        "width": 1,
        "height": 1,
        "original_width": null,
        "original_height": null,
        "background_color": "#f0f4f0"
    }'::jsonb,
    ADD COLUMN IF NOT EXISTS visualization_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS master_plan_svg TEXT;  -- Raw SVG content for SVG-type plans

-- ----------------------------------------------------------------------------
-- EXTEND DEV_UNITS — Link to buildings and add coordinates
-- ----------------------------------------------------------------------------

ALTER TABLE dev_units
    ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES dev_buildings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES dev_floors(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS coordinates JSONB,      -- Position on floor plan (normalized 0-1)
    ADD COLUMN IF NOT EXISTS polygon_id UUID REFERENCES dev_layout_polygons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dev_units_building ON dev_units(building_id);
CREATE INDEX IF NOT EXISTS idx_dev_units_floor ON dev_units(floor_id);

-- ----------------------------------------------------------------------------
-- GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

GRANT ALL PRIVILEGES ON dev_buildings TO nestfind_user;
GRANT ALL PRIVILEGES ON dev_floors TO nestfind_user;
GRANT ALL PRIVILEGES ON dev_layout_polygons TO nestfind_user;
GRANT ALL PRIVILEGES ON dev_amenities TO nestfind_user;
GRANT ALL PRIVILEGES ON dev_roads TO nestfind_user;
