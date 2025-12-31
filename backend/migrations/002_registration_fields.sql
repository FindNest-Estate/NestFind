-- Migration: 002_registration_fields.sql
-- Purpose: Add mandatory registration fields for USER and AGENT
-- Date: 2024-12-21

-- ============================================================================
-- USERS TABLE MODIFICATIONS
-- ============================================================================

-- Add location fields (mandatory for new registrations)
ALTER TABLE users ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN longitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN address TEXT;

-- Note: mobile_number already exists but was optional
-- For fresh DB, we make it conceptually required via backend validation
-- Existing column: mobile_number TEXT (nullable for backward compat)

-- ============================================================================
-- AGENT PROFILES TABLE (New)
-- ============================================================================

CREATE TABLE agent_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    pan_number TEXT NOT NULL,
    aadhaar_number TEXT NOT NULL,
    service_radius_km INT NOT NULL DEFAULT 50,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_service_radius CHECK (service_radius_km > 0 AND service_radius_km <= 100)
);

-- Index for foreign key lookups
CREATE INDEX idx_agent_profiles_user_id ON agent_profiles(user_id);
