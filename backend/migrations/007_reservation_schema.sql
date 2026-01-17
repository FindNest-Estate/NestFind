-- Migration: 007_reservation_schema.sql
-- Purpose: Create reservation table for property reservation with 0.1% payment
-- Date: 2026-01-05

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Reservation Status Enum
CREATE TYPE reservation_status AS ENUM (
    'ACTIVE',         -- Reservation is active (payment received)
    'EXPIRED',        -- Reservation expired (30 days passed)
    'CANCELLED',      -- Buyer cancelled (forfeits deposit)
    'COMPLETED'       -- Transaction completed successfully
);

-- ============================================================================
-- RESERVATIONS TABLE
-- ============================================================================

CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    -- Reservation Amount (0.1% of property price)
    amount DECIMAL(15,2) NOT NULL,
    property_price DECIMAL(15,2) NOT NULL,  -- Snapshot of agreed price
    
    -- Validity Period (30 days)
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    
    -- Status
    status reservation_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Cancellation Details
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    refund_amount DECIMAL(15,2),  -- NULL if forfeited, amount if refunded
    
    -- Payment Reference (external payment system)
    payment_reference TEXT,
    payment_method TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_property_price_positive CHECK (property_price > 0),
    CONSTRAINT chk_end_after_start CHECK (end_date > start_date)
);

-- Reservations Indexes
CREATE INDEX idx_reservations_property ON reservations(property_id);
CREATE INDEX idx_reservations_buyer ON reservations(buyer_id);
CREATE INDEX idx_reservations_offer ON reservations(offer_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_end_date ON reservations(end_date) WHERE status = 'ACTIVE';

-- Unique constraint: Only one active reservation per property
CREATE UNIQUE INDEX idx_unique_active_reservation ON reservations(property_id) 
    WHERE status = 'ACTIVE';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for reservations
CREATE OR REPLACE FUNCTION update_reservations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_reservations_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE reservations IS 'Property reservations with 0.1% deposit, valid for 30 days';
COMMENT ON COLUMN reservations.amount IS '0.1% of property price paid to reserve';
COMMENT ON COLUMN reservations.property_price IS 'Snapshot of agreed price at reservation time';
COMMENT ON COLUMN reservations.status IS 'ACTIVE → COMPLETED/EXPIRED/CANCELLED';
