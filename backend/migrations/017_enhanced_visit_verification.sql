-- Migration: 017_enhanced_visit_verification.sql
-- Purpose: Add visit OTP, feedback, and images tables for enhanced visit verification
-- Date: 2026-01-16

-- ============================================================================
-- VISIT OTP TABLE
-- ============================================================================

CREATE TABLE visit_otp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visit_requests(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,  -- Plaintext for display on buyer page
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_otp_code_length CHECK (LENGTH(otp_code) = 6)
);

-- Indexes
CREATE INDEX idx_visit_otp_visit ON visit_otp(visit_id);
CREATE INDEX idx_visit_otp_expires ON visit_otp(expires_at);

-- Only one active OTP per visit (cleanup old ones before creating new)
CREATE UNIQUE INDEX idx_visit_otp_unique_active ON visit_otp(visit_id) 
    WHERE expires_at > NOW();

-- ============================================================================
-- VISIT FEEDBACK - AGENT
-- ============================================================================

CREATE TABLE visit_feedback_agent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL UNIQUE REFERENCES visit_requests(id) ON DELETE CASCADE,
    
    -- Interest & Budget Assessment
    buyer_interest_level INT CHECK (buyer_interest_level BETWEEN 1 AND 5),
    buyer_perceived_budget VARCHAR(50),  -- LOW/MEDIUM/HIGH/PREMIUM
    
    -- Property Notes
    property_condition_notes TEXT,
    buyer_questions TEXT,
    
    -- Recommendation
    follow_up_required BOOLEAN DEFAULT false,
    recommended_action VARCHAR(50),  -- PROCEED/NEGOTIATE/PASS/UNDECIDED
    
    -- Additional Notes
    additional_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_visit_feedback_agent_visit ON visit_feedback_agent(visit_id);

-- ============================================================================
-- VISIT FEEDBACK - BUYER
-- ============================================================================

CREATE TABLE visit_feedback_buyer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL UNIQUE REFERENCES visit_requests(id) ON DELETE CASCADE,
    
    -- Ratings
    overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
    agent_professionalism INT CHECK (agent_professionalism BETWEEN 1 AND 5),
    property_condition_rating INT CHECK (property_condition_rating BETWEEN 1 AND 5),
    
    -- Assessment
    property_as_described BOOLEAN,
    interest_level VARCHAR(20),  -- HIGH/MEDIUM/LOW/NOT_INTERESTED
    
    -- Feedback Text
    liked_aspects TEXT,
    concerns TEXT,
    
    -- Recommendation
    would_recommend BOOLEAN,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_visit_feedback_buyer_visit ON visit_feedback_buyer(visit_id);

-- ============================================================================
-- VISIT IMAGES
-- ============================================================================

CREATE TABLE visit_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visit_requests(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role & Type
    uploader_role VARCHAR(20) NOT NULL CHECK (uploader_role IN ('AGENT', 'BUYER')),
    image_type VARCHAR(50),  -- PROPERTY/MEETING/DOCUMENT/OTHER
    
    -- File Details
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INT,
    
    -- Description
    caption TEXT,
    
    -- Soft Delete
    deleted_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_visit_images_visit ON visit_images(visit_id);
CREATE INDEX idx_visit_images_uploader ON visit_images(uploaded_by);
CREATE INDEX idx_visit_images_active ON visit_images(visit_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for visit_feedback_agent
CREATE OR REPLACE FUNCTION update_visit_feedback_agent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_visit_feedback_agent_updated_at
    BEFORE UPDATE ON visit_feedback_agent
    FOR EACH ROW
    EXECUTE FUNCTION update_visit_feedback_agent_timestamp();

-- Updated_at trigger for visit_feedback_buyer
CREATE OR REPLACE FUNCTION update_visit_feedback_buyer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_visit_feedback_buyer_updated_at
    BEFORE UPDATE ON visit_feedback_buyer
    FOR EACH ROW
    EXECUTE FUNCTION update_visit_feedback_buyer_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE visit_otp IS 'OTP codes for buyer presence verification during property visits';
COMMENT ON TABLE visit_feedback_agent IS 'Agent feedback submitted after property visit completion';
COMMENT ON TABLE visit_feedback_buyer IS 'Buyer feedback submitted after property visit completion';
COMMENT ON TABLE visit_images IS 'Images uploaded during property visits for documentation';

COMMENT ON COLUMN visit_otp.otp_code IS '6-digit OTP displayed on buyer page and emailed to buyer';
COMMENT ON COLUMN visit_feedback_agent.recommended_action IS 'Agent recommendation: PROCEED, NEGOTIATE, PASS, or UNDECIDED';
COMMENT ON COLUMN visit_feedback_buyer.interest_level IS 'Buyer interest: HIGH, MEDIUM, LOW, or NOT_INTERESTED';
