-- Migration: 008_transaction_schema.sql
-- Purpose: Create transaction and payment tables for deal completion
-- Date: 2026-01-05

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Transaction Status Enum
CREATE TYPE transaction_status AS ENUM (
    'INITIATED',       -- Transaction started (registration scheduled)
    'BUYER_VERIFIED',  -- Buyer OTP verified
    'SELLER_VERIFIED', -- Seller OTP verified (both parties verified)
    'COMPLETED',       -- Transaction completed successfully
    'FAILED',          -- Transaction failed
    'CANCELLED'        -- Transaction cancelled
);

-- Payment Status Enum
CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
);

-- Payment Type Enum
CREATE TYPE payment_type AS ENUM (
    'RESERVATION',     -- 0.1% reservation payment (buyer)
    'COMMISSION',      -- 0.9% commission payment (seller)
    'REFUND'           -- Refund payment
);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    
    -- Parties Involved
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    agent_id UUID NOT NULL REFERENCES agent_profiles(user_id),
    
    -- Financial Details
    total_price DECIMAL(15,2) NOT NULL,
    reservation_amount DECIMAL(15,2) NOT NULL,  -- 0.1%
    commission_amount DECIMAL(15,2) NOT NULL,   -- 0.9%
    platform_fee DECIMAL(15,2) NOT NULL,        -- 20% of total commission
    agent_commission DECIMAL(15,2) NOT NULL,    -- 80% of total commission
    
    -- Status
    status transaction_status NOT NULL DEFAULT 'INITIATED',
    
    -- Registration Details
    registration_date TIMESTAMP,
    registration_location TEXT,
    
    -- OTP Verification
    buyer_otp_hash TEXT,
    buyer_otp_expires_at TIMESTAMP,
    buyer_otp_verified_at TIMESTAMP,
    
    seller_otp_hash TEXT,
    seller_otp_expires_at TIMESTAMP,
    seller_otp_verified_at TIMESTAMP,
    
    -- Agent GPS Verification
    agent_gps_lat DOUBLE PRECISION,
    agent_gps_lng DOUBLE PRECISION,
    agent_gps_verified_at TIMESTAMP,
    
    -- Completion
    completed_at TIMESTAMP,
    failure_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_total_price_positive CHECK (total_price > 0),
    CONSTRAINT chk_commission_amounts CHECK (platform_fee + agent_commission = commission_amount),
    CONSTRAINT chk_different_parties CHECK (buyer_id != seller_id)
);

-- Transactions Indexes
CREATE INDEX idx_transactions_property ON transactions(property_id);
CREATE INDEX idx_transactions_reservation ON transactions(reservation_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_agent ON transactions(agent_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_registration_date ON transactions(registration_date) 
    WHERE status = 'INITIATED';

-- Unique constraint: One transaction per reservation
CREATE UNIQUE INDEX idx_unique_reservation_transaction ON transactions(reservation_id);

-- ============================================================================
-- PAYMENT_LOGS TABLE
-- ============================================================================

CREATE TABLE payment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    
    -- Payment Details
    payer_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    payment_type payment_type NOT NULL,
    status payment_status NOT NULL DEFAULT 'PENDING',
    
    -- External Payment Reference
    payment_reference TEXT,
    payment_method TEXT,
    gateway_response JSONB,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Error Details
    error_message TEXT,
    
    -- Constraints
    CONSTRAINT chk_payment_amount_positive CHECK (amount > 0)
);

-- Payment Logs Indexes
CREATE INDEX idx_payment_logs_transaction ON payment_logs(transaction_id);
CREATE INDEX idx_payment_logs_reservation ON payment_logs(reservation_id);
CREATE INDEX idx_payment_logs_payer ON payment_logs(payer_id);
CREATE INDEX idx_payment_logs_status ON payment_logs(status);
CREATE INDEX idx_payment_logs_type ON payment_logs(payment_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for transactions
CREATE OR REPLACE FUNCTION update_transactions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE transactions IS 'Property sale transactions with multi-party verification';
COMMENT ON TABLE payment_logs IS 'Payment tracking for reservations and commissions';

COMMENT ON COLUMN transactions.status IS 'INITIATED → BUYER_VERIFIED → SELLER_VERIFIED → COMPLETED';
COMMENT ON COLUMN transactions.platform_fee IS '20% of total 1% commission (0.2% of property price)';
COMMENT ON COLUMN transactions.agent_commission IS '80% of total 1% commission (0.8% of property price)';
