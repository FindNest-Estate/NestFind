-- Phase 4B: Disputes & Trust Enforcement
-- 1. Add Freeze Capability to Deals
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS freeze_reason TEXT;

-- 2. Create Disputes Table
-- Note: Using TEXT for ENUMs to maintain flexibility and avoid migration complexity with PostgreSQL types
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id),
    raised_by UUID NOT NULL REFERENCES users(id),
    
    -- Type ENUM: 'BOOKING_PROOF_DISPUTED', 'AMOUNT_MISMATCH', 'COMMISSION_DISPUTE', 'DOCUMENT_INCOMPLETE', 'OTHER'
    type TEXT NOT NULL CHECK (type IN ('BOOKING_PROOF_DISPUTED', 'AMOUNT_MISMATCH', 'COMMISSION_DISPUTE', 'DOCUMENT_INCOMPLETE', 'OTHER')),
    
    -- Status ENUM: 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')) DEFAULT 'OPEN',
    
    description TEXT NOT NULL,
    admin_notes TEXT,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    
    -- Resolution Link (which ledger entry resolved this?)
    resolution_entry_id UUID REFERENCES ledger_entries(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_disputes_deal_id ON disputes(deal_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- Comments for documentation
COMMENT ON TABLE disputes IS 'Tracks issues raised by participants or admins. Open disputes usually freeze the deal.';
COMMENT ON COLUMN deals.is_frozen IS 'If true, no state transitions or financial verifications are allowed.';
