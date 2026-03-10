-- Migration: Create Financial Ledger Tables
-- Description: Adds structures for tracking deal finances and commission calculations (No money movement).

-- 1. Financial Ledgers (One per Deal)
CREATE TABLE IF NOT EXISTS financial_ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    
    -- Snapshot of deal value at time of ledger creation/update
    total_deal_value NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    
    -- Commission Calcs (Computed, not paid)
    total_commission_owed NUMERIC(15, 2) DEFAULT 0,
    platform_fee NUMERIC(15, 2) DEFAULT 0,
    agent_commission NUMERIC(15, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, CALCULATED, VERIFIED, FROZEN, SETTLED
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_deal_ledger UNIQUE (deal_id)
);

-- 2. Ledger Entries (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID NOT NULL REFERENCES financial_ledgers(id) ON DELETE CASCADE,
    
    -- Transaction Details
    entry_type VARCHAR(50) NOT NULL, -- BOOKING_DECLARED, COMMISSION_CALCULATED, ADJUSTMENT, PLATFORM_FEE
    amount NUMERIC(15, 2) NOT NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT', 'INFO')),
    
    -- Context
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store proof_url, notes, calculation_basis here
    
    -- Verification (Refinement 1)
    verification_status VARCHAR(20) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Audit
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_financial_ledgers_deal_id ON financial_ledgers(deal_id);
CREATE INDEX idx_ledger_entries_ledger_id ON ledger_entries(ledger_id);
CREATE INDEX idx_ledger_entries_type ON ledger_entries(entry_type);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_financial_ledgers_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_ledgers_timestamp
BEFORE UPDATE ON financial_ledgers
FOR EACH ROW
EXECUTE FUNCTION update_financial_ledgers_modtime();
