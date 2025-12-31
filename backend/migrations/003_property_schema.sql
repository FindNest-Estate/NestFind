-- Migration: 003_property_schema.sql
-- Purpose: Create property management tables for /sell feature
-- Date: 2024-12-23

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Property Status Enum (complete lifecycle)
CREATE TYPE property_status AS ENUM (
    'DRAFT',
    'PENDING_ASSIGNMENT',
    'ASSIGNED',
    'VERIFICATION_IN_PROGRESS',
    'ACTIVE',
    'INACTIVE',
    'RESERVED',
    'SOLD'
);

-- Property Type Enum
CREATE TYPE property_type AS ENUM (
    'LAND',
    'HOUSE',
    'APARTMENT',
    'COMMERCIAL'
);

-- Agent Assignment Status Enum
CREATE TYPE assignment_status AS ENUM (
    'REQUESTED',
    'ACCEPTED',
    'DECLINED',
    'COMPLETED',
    'CANCELLED'
);

-- Media Type Enum
CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO');

-- Verification Result Enum
CREATE TYPE verification_result AS ENUM ('APPROVED', 'REJECTED');

-- ============================================================================
-- PROPERTIES TABLE
-- ============================================================================

CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Core Fields (nullable in DRAFT state)
    title TEXT,
    description TEXT,
    type property_type,
    price DECIMAL(15,2),
    
    -- Location (required for agent discovery)
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    city TEXT,
    
    -- Property Details (optional)
    bedrooms INT,
    bathrooms INT,
    area_sqft DECIMAL(10,2),
    
    -- Status & Lifecycle
    status property_status NOT NULL DEFAULT 'DRAFT',
    
    -- Concurrency Control
    version INT NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP,                  -- when submitted for verification
    verified_at TIMESTAMP,                   -- when agent approved
    sold_at TIMESTAMP,                       -- when transaction completed
    
    -- Soft Delete
    deleted_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_price_positive CHECK (price IS NULL OR price > 0),
    CONSTRAINT chk_area_positive CHECK (area_sqft IS NULL OR area_sqft > 0),
    CONSTRAINT chk_bedrooms_positive CHECK (bedrooms IS NULL OR bedrooms >= 0),
    CONSTRAINT chk_bathrooms_positive CHECK (bathrooms IS NULL OR bathrooms >= 0)
);

-- Properties Indexes
CREATE INDEX idx_properties_seller_id ON properties(seller_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_location ON properties(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_properties_active ON properties(status) WHERE status = 'ACTIVE' AND deleted_at IS NULL;
CREATE INDEX idx_properties_created_at ON properties(created_at);

-- ============================================================================
-- PROPERTY MEDIA TABLE
-- ============================================================================

CREATE TABLE property_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Media Details
    media_type media_type NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    original_filename TEXT,
    
    -- Display Ordering
    display_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    
    -- Soft Delete
    deleted_at TIMESTAMP
);

-- Property Media Indexes
CREATE INDEX idx_property_media_property_id ON property_media(property_id);
CREATE INDEX idx_property_media_active ON property_media(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_media_primary ON property_media(property_id) WHERE is_primary = true AND deleted_at IS NULL;

-- ============================================================================
-- AGENT ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE agent_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agent_profiles(user_id) ON DELETE CASCADE,
    
    -- Assignment Status
    status assignment_status NOT NULL DEFAULT 'REQUESTED',
    
    -- Timestamps
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Rejection Details
    decline_reason TEXT
);

-- Agent Assignments Indexes
CREATE INDEX idx_agent_assignments_property ON agent_assignments(property_id);
CREATE INDEX idx_agent_assignments_agent ON agent_assignments(agent_id);
CREATE INDEX idx_agent_assignments_status ON agent_assignments(status);
CREATE INDEX idx_agent_assignments_active ON agent_assignments(property_id) WHERE status IN ('REQUESTED', 'ACCEPTED');

-- Unique constraint: Only one active assignment per property
CREATE UNIQUE INDEX idx_unique_active_assignment ON agent_assignments(property_id) 
    WHERE status IN ('REQUESTED', 'ACCEPTED');

-- ============================================================================
-- PROPERTY VERIFICATIONS TABLE
-- ============================================================================

CREATE TABLE property_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agent_profiles(user_id),
    
    -- Verification Timeline
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- GPS Verification
    agent_gps_lat DOUBLE PRECISION,
    agent_gps_lng DOUBLE PRECISION,
    gps_verified_at TIMESTAMP,
    
    -- Verification Result
    result verification_result,
    rejection_reason TEXT,
    notes TEXT,
    
    -- Seller OTP Verification (on-site)
    seller_otp_verified BOOLEAN DEFAULT false,
    seller_otp_verified_at TIMESTAMP
);

-- Property Verifications Indexes
CREATE INDEX idx_property_verifications_property ON property_verifications(property_id);
CREATE INDEX idx_property_verifications_agent ON property_verifications(agent_id);
CREATE INDEX idx_property_verifications_pending ON property_verifications(property_id) WHERE completed_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function (also increments version)
CREATE OR REPLACE FUNCTION update_properties_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Apply trigger to properties table
CREATE TRIGGER trg_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_properties_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE properties IS 'Property listings managed by sellers';
COMMENT ON TABLE property_media IS 'Images and videos attached to properties';
COMMENT ON TABLE agent_assignments IS 'Agent-property assignment requests and status';
COMMENT ON TABLE property_verifications IS 'Agent verification records with GPS and OTP proof';

COMMENT ON COLUMN properties.status IS 'Property lifecycle state: DRAFT → PENDING_ASSIGNMENT → ASSIGNED → VERIFICATION_IN_PROGRESS → ACTIVE → RESERVED → SOLD';
COMMENT ON COLUMN properties.version IS 'Optimistic locking version for concurrent edit detection';
COMMENT ON COLUMN agent_assignments.status IS 'REQUESTED (pending agent response), ACCEPTED, DECLINED, COMPLETED, CANCELLED';
