-- Migration 033: Enhanced Seller Listing Fields
-- Purpose: Add detailed property fields for the expanded seller listing flow
-- Date: 2026-03-11

-- ============================================================================
-- PROPERTY SUB-TYPE
-- Adds granularity within existing 4 category enum:
--   APARTMENT → FLAT, STUDIO, PENTHOUSE, DUPLEX
--   HOUSE     → INDEPENDENT_HOUSE, VILLA, BUNGALOW, ROW_HOUSE
--   LAND      → PLOT, FARMLAND, PLANTATION, INDUSTRIAL_PLOT
--   COMMERCIAL → OFFICE, SHOP, WAREHOUSE, CO_WORKING
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_sub_type VARCHAR(50);

-- ============================================================================
-- APARTMENT / HOUSE SPECIFIC
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_number INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS balconies INT DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS furnishing_status VARCHAR(30);
-- Values: UNFURNISHED | SEMI_FURNISHED | FULLY_FURNISHED

ALTER TABLE properties ADD COLUMN IF NOT EXISTS facing_direction VARCHAR(10);
-- Values: NORTH | SOUTH | EAST | WEST | NE | NW | SE | SW

-- ============================================================================
-- PARKING
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_count INT DEFAULT 0;

-- ============================================================================
-- LAND SPECIFIC
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS road_access BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS land_type VARCHAR(30);
-- Values: RESIDENTIAL | COMMERCIAL | AGRICULTURAL | INDUSTRIAL

-- ============================================================================
-- PRICING DETAILS
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_negotiable BOOLEAN DEFAULT true;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_charges DECIMAL(10,2);
-- Monthly maintenance (INR), mostly for apartments

-- ============================================================================
-- OWNERSHIP & PROPERTY AGE
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_age_years INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(30);
-- Values: SINGLE | JOINT | COMPANY

-- ============================================================================
-- AVAILABILITY
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS availability_status VARCHAR(30) DEFAULT 'READY_TO_MOVE';
-- Values: READY_TO_MOVE | UNDER_CONSTRUCTION | IMMEDIATE

-- ============================================================================
-- AMENITIES (stored as JSONB array of strings)
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;
-- Example: ["PARKING", "LIFT", "SECURITY", "SWIMMING_POOL", "GYM",
--           "POWER_BACKUP", "PLAY_AREA", "CLUB_HOUSE", "INTERNET", "CCTV"]

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
ALTER TABLE properties ADD CONSTRAINT chk_floor_number_positive
    CHECK (floor_number IS NULL OR floor_number >= 0);
ALTER TABLE properties ADD CONSTRAINT chk_total_floors_positive
    CHECK (total_floors IS NULL OR total_floors >= 1);
ALTER TABLE properties ADD CONSTRAINT chk_balconies_positive
    CHECK (balconies IS NULL OR balconies >= 0);
ALTER TABLE properties ADD CONSTRAINT chk_parking_count_positive
    CHECK (parking_count IS NULL OR parking_count >= 0);
ALTER TABLE properties ADD CONSTRAINT chk_property_age_positive
    CHECK (property_age_years IS NULL OR property_age_years >= 0);
ALTER TABLE properties ADD CONSTRAINT chk_maintenance_positive
    CHECK (maintenance_charges IS NULL OR maintenance_charges >= 0);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_sub_type ON properties(property_sub_type) WHERE property_sub_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_furnishing ON properties(furnishing_status) WHERE furnishing_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_availability ON properties(availability_status) WHERE availability_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_amenities ON properties USING GIN(amenities) WHERE amenities != '[]'::jsonb;
