-- Migration: 006_visit_offer_schema.sql
-- Purpose: Create visit requests and offer tables for buyer interactions
-- Date: 2026-01-05

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Visit Status Enum (complete lifecycle)
CREATE TYPE visit_status AS ENUM (
    'REQUESTED',      -- Buyer requested visit
    'APPROVED',       -- Agent approved the visit
    'REJECTED',       -- Agent rejected the visit
    'CHECKED_IN',     -- Agent checked in at property (GPS verified)
    'COMPLETED',      -- Visit completed successfully
    'NO_SHOW',        -- Buyer didn't show up
    'CANCELLED'       -- Visit cancelled by buyer or agent
);

-- Offer Status Enum
CREATE TYPE offer_status AS ENUM (
    'PENDING',        -- Offer awaiting seller response
    'ACCEPTED',       -- Seller accepted the offer
    'REJECTED',       -- Seller rejected the offer
    'COUNTERED',      -- Seller made a counter offer
    'EXPIRED',        -- Offer expired without response
    'WITHDRAWN'       -- Buyer withdrew the offer
);

-- ============================================================================
-- VISIT_REQUESTS TABLE
-- ============================================================================

CREATE TABLE visit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agent_profiles(user_id) ON DELETE CASCADE,
    
    -- Visit Scheduling
    preferred_date TIMESTAMP NOT NULL,
    confirmed_date TIMESTAMP,
    
    -- Visit Status
    status visit_status NOT NULL DEFAULT 'REQUESTED',
    
    -- Agent Response
    rejection_reason TEXT,
    
    -- Buyer Contact (optional message)
    buyer_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP,          -- When agent approved/rejected
    
    -- Constraints
    CONSTRAINT chk_preferred_date_future CHECK (preferred_date > created_at)
);

-- Visit Requests Indexes
CREATE INDEX idx_visit_requests_property ON visit_requests(property_id);
CREATE INDEX idx_visit_requests_buyer ON visit_requests(buyer_id);
CREATE INDEX idx_visit_requests_agent ON visit_requests(agent_id);
CREATE INDEX idx_visit_requests_status ON visit_requests(status);
CREATE INDEX idx_visit_requests_date ON visit_requests(preferred_date);

-- Unique constraint: One pending visit per buyer per property
CREATE UNIQUE INDEX idx_unique_pending_visit ON visit_requests(property_id, buyer_id) 
    WHERE status IN ('REQUESTED', 'APPROVED');

-- ============================================================================
-- VISIT_VERIFICATIONS TABLE
-- ============================================================================

CREATE TABLE visit_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visit_requests(id) ON DELETE CASCADE,
    
    -- GPS Verification (Agent check-in)
    agent_gps_lat DOUBLE PRECISION,
    agent_gps_lng DOUBLE PRECISION,
    gps_verified_at TIMESTAMP,
    gps_distance_meters FLOAT,  -- Distance from property location
    
    -- Visit Completion
    completed_at TIMESTAMP,
    duration_minutes INT,       -- How long the visit lasted
    
    -- Notes
    agent_notes TEXT,
    buyer_feedback TEXT,
    
    -- Rating (optional, buyer rates the visit)
    buyer_rating INT CHECK (buyer_rating >= 1 AND buyer_rating <= 5),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Visit Verifications Indexes
CREATE INDEX idx_visit_verifications_visit ON visit_verifications(visit_id);
CREATE UNIQUE INDEX idx_unique_visit_verification ON visit_verifications(visit_id);

-- ============================================================================
-- OFFERS TABLE
-- ============================================================================

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Offer Details
    offered_price DECIMAL(15,2) NOT NULL,
    
    -- For Counter Offers
    parent_offer_id UUID REFERENCES offers(id),
    counter_price DECIMAL(15,2),
    
    -- Status
    status offer_status NOT NULL DEFAULT 'PENDING',
    
    -- Expiry (48 hours from creation by default)
    expires_at TIMESTAMP NOT NULL,
    
    -- Response Details
    rejection_reason TEXT,
    
    -- Buyer Message
    buyer_message TEXT,
    seller_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_offered_price_positive CHECK (offered_price > 0),
    CONSTRAINT chk_counter_price_positive CHECK (counter_price IS NULL OR counter_price > 0),
    CONSTRAINT chk_expires_after_created CHECK (expires_at > created_at)
);

-- Offers Indexes
CREATE INDEX idx_offers_property ON offers(property_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_expires ON offers(expires_at) WHERE status = 'PENDING';
CREATE INDEX idx_offers_parent ON offers(parent_offer_id) WHERE parent_offer_id IS NOT NULL;

-- Unique constraint: One pending offer per buyer per property
CREATE UNIQUE INDEX idx_unique_pending_offer ON offers(property_id, buyer_id) 
    WHERE status = 'PENDING';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for visit_requests
CREATE OR REPLACE FUNCTION update_visit_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_visit_requests_updated_at
    BEFORE UPDATE ON visit_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_visit_requests_timestamp();

-- Updated_at trigger for offers
CREATE OR REPLACE FUNCTION update_offers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_offers_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_offers_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE visit_requests IS 'Buyer visit requests for properties, managed by assigned agent';
COMMENT ON TABLE visit_verifications IS 'GPS and completion verification for property visits';
COMMENT ON TABLE offers IS 'Buyer offers and seller counter-offers for properties';

COMMENT ON COLUMN visit_requests.status IS 'REQUESTED → APPROVED/REJECTED, APPROVED → CHECKED_IN → COMPLETED/NO_SHOW/CANCELLED';
COMMENT ON COLUMN offers.status IS 'PENDING → ACCEPTED/REJECTED/COUNTERED/EXPIRED/WITHDRAWN';
COMMENT ON COLUMN offers.expires_at IS 'Offers expire 48 hours after creation by default';
