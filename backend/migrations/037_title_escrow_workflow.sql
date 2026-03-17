-- Migration: 037_title_escrow_workflow.sql
-- Purpose: Add Title Searches and Escrow Disbursement milestone tracking
-- Date: 2026-03-16

CREATE TYPE title_search_status AS ENUM (
    'PENDING_SEARCH',
    'CLEAR',
    'ENCUMBRANCES_FOUND',
    'REJECTED'
);

CREATE TYPE escrow_disbursement_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'DISBURSED',
    'FAILED'
);

CREATE TABLE title_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    
    agency_name TEXT NOT NULL,
    checker_name TEXT,
    
    status title_search_status NOT NULL DEFAULT 'PENDING_SEARCH',
    
    report_url TEXT,
    encumbrance_notes TEXT,
    
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track where the money actually goes after the deal is done
CREATE TABLE escrow_disbursements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    
    payee_id UUID NOT NULL REFERENCES users(id),
    payee_role TEXT NOT NULL, -- e.g., 'SELLER', 'AGENT', 'PLATFORM', 'CONTRACTOR'
    
    amount DECIMAL(15,2) NOT NULL,
    purpose TEXT NOT NULL, -- e.g., 'SALE_PROCEEDS', 'AGENT_COMMISSION', 'PLATFORM_FEE'
    
    status escrow_disbursement_status NOT NULL DEFAULT 'PENDING',
    payment_reference TEXT,
    bank_account_last4 VARCHAR(4),
    
    disbursed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_disbursement_amount_positive CHECK (amount > 0)
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_escrow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_title_searches_updated_at
    BEFORE UPDATE ON title_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_escrow_timestamp();

CREATE TRIGGER trg_escrow_disbursements_updated_at
    BEFORE UPDATE ON escrow_disbursements
    FOR EACH ROW
    EXECUTE FUNCTION update_escrow_timestamp();
