-- Migration: 018_reservation_enhancements.sql
-- Purpose: Add admin verification workflow and enhanced property statuses
-- Date: 2026-01-16

-- ============================================================================
-- Reservation Admin Verification Fields
-- ============================================================================

ALTER TABLE reservations 
    ADD COLUMN IF NOT EXISTS admin_verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS admin_verified_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS admin_notes TEXT,
    ADD COLUMN IF NOT EXISTS pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING';

-- Add constraint for verification status
ALTER TABLE reservations 
    ADD CONSTRAINT chk_verification_status 
    CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- Index for pending verifications
CREATE INDEX IF NOT EXISTS idx_reservations_verification 
    ON reservations(verification_status) 
    WHERE status = 'ACTIVE' AND verification_status = 'PENDING';

-- ============================================================================
-- Property Status Updates
-- ============================================================================

-- Add new property statuses if they don't exist
DO $$ 
BEGIN
    -- Check if RESERVED exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RESERVED' AND enumtypid = 'property_status'::regtype) THEN
        ALTER TYPE property_status ADD VALUE 'RESERVED';
    END IF;
    
    -- Check if SOLD exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SOLD' AND enumtypid = 'property_status'::regtype) THEN
        ALTER TYPE property_status ADD VALUE 'SOLD';
    END IF;
END $$;

-- ============================================================================
-- Offer-Visit Relationship (optional link)
-- ============================================================================

-- Link offers to visits if buyer made offer after visit
ALTER TABLE offers 
    ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visit_requests(id);

CREATE INDEX IF NOT EXISTS idx_offers_visit 
    ON offers(visit_id) 
    WHERE visit_id IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN reservations.verification_status IS 'PENDING → APPROVED/REJECTED by admin';
COMMENT ON COLUMN reservations.pdf_url IS 'URL to generated agreement PDF after approval';
COMMENT ON COLUMN offers.visit_id IS 'Optional link to visit that led to this offer';
