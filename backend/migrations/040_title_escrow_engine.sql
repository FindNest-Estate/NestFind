-- ============================================================================
-- Migration: 040_title_escrow_engine.sql
-- Purpose: Full Title Search & Escrow Workflow Engine
-- Date: 2026-03-18
-- ============================================================================

-- ============================================================================
-- 1. EXTEND TITLE_SEARCH_STATUS ENUM
-- ============================================================================
ALTER TYPE title_search_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE title_search_status ADD VALUE IF NOT EXISTS 'RESOLUTION_IN_PROGRESS';
ALTER TYPE title_search_status ADD VALUE IF NOT EXISTS 'EXPIRED';

-- ============================================================================
-- 2. EXTEND ESCROW_DISBURSEMENT_STATUS ENUM
-- ============================================================================
ALTER TYPE escrow_disbursement_status ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE escrow_disbursement_status ADD VALUE IF NOT EXISTS 'ON_HOLD';
ALTER TYPE escrow_disbursement_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- ============================================================================
-- 3. ALTER TITLE_SEARCHES TABLE
-- ============================================================================
ALTER TABLE title_searches
    ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
    ADD COLUMN IF NOT EXISTS clearance_docs JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS encumbrance_details JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS resolution_plan TEXT,
    ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Backfill started_at to NULL (it was DEFAULT NOW() in original schema, 
-- but state machine sets it on IN_PROGRESS transition)
-- Keep existing rows as-is; new searches will have NULL until transitioned.

CREATE INDEX IF NOT EXISTS idx_title_searches_deal ON title_searches(deal_id);
CREATE INDEX IF NOT EXISTS idx_title_searches_status ON title_searches(status);
CREATE INDEX IF NOT EXISTS idx_title_searches_deal_status
    ON title_searches(deal_id, status);

-- ============================================================================
-- 4. ALTER ESCROW_DISBURSEMENTS TABLE
-- ============================================================================
ALTER TABLE escrow_disbursements
    ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS payment_intent_id UUID REFERENCES payment_intents(id),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS hold_reason TEXT,
    ADD COLUMN IF NOT EXISTS hold_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS hold_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_escrow_disbursements_deal
    ON escrow_disbursements(deal_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disbursements_status
    ON escrow_disbursements(status);
CREATE INDEX IF NOT EXISTS idx_escrow_disbursements_payment_intent
    ON escrow_disbursements(payment_intent_id);

-- ============================================================================
-- 5. STAMP DUTY RATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS stamp_duty_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state TEXT NOT NULL,
    property_type TEXT NOT NULL DEFAULT 'RESIDENTIAL',
    rate_male DECIMAL(5,2) NOT NULL,
    rate_female DECIMAL(5,2) NOT NULL,
    rate_joint DECIMAL(5,2) NOT NULL,
    registration_rate DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    registration_cap DECIMAL(15,2),             -- NULL = no cap
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(state, property_type, effective_from)
);

-- Seed initial rates
INSERT INTO stamp_duty_rates (state, property_type, rate_male, rate_female, rate_joint, registration_rate, registration_cap) VALUES
('MAHARASHTRA',  'RESIDENTIAL', 6.00, 5.00, 6.00, 1.00, 30000),
('KARNATAKA',    'RESIDENTIAL', 5.60, 5.60, 5.60, 1.00, NULL),
('TAMIL_NADU',   'RESIDENTIAL', 7.00, 7.00, 7.00, 1.00, NULL),
('DELHI',        'RESIDENTIAL', 6.00, 4.00, 6.00, 1.00, NULL),
('TELANGANA',    'RESIDENTIAL', 6.00, 6.00, 6.00, 0.50, NULL),
('UP',           'RESIDENTIAL', 7.00, 6.00, 7.00, 1.00, NULL),
('RAJASTHAN',    'RESIDENTIAL', 6.00, 5.00, 6.00, 1.00, NULL),
('GUJARAT',      'RESIDENTIAL', 4.90, 4.90, 4.90, 1.00, NULL),
('KERALA',       'RESIDENTIAL', 8.00, 8.00, 8.00, 2.00, NULL),
('MP',           'RESIDENTIAL', 7.50, 6.50, 7.50, 1.00, NULL),
('AP',           'RESIDENTIAL', 6.00, 6.00, 6.00, 0.50, NULL),
('WEST_BENGAL',  'RESIDENTIAL', 7.00, 7.00, 7.00, 1.00, NULL),
('DEFAULT',      'RESIDENTIAL', 6.00, 5.00, 6.00, 1.00, 30000)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. TITLE ESCROW EVENTS TABLE (immutable audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS title_escrow_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,      -- 'TITLE_SEARCH' or 'ESCROW_DISBURSEMENT'
    entity_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    actor_id UUID REFERENCES users(id),
    actor_type TEXT NOT NULL,       -- 'AGENT', 'ADMIN', 'SYSTEM'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_title_escrow_events_entity
    ON title_escrow_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_title_escrow_events_created
    ON title_escrow_events(created_at);

-- Immutability trigger function
CREATE OR REPLACE FUNCTION prevent_title_escrow_events_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'title_escrow_events is immutable — no UPDATE or DELETE allowed.';
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_title_escrow_events_no_update ON title_escrow_events;
CREATE TRIGGER trg_title_escrow_events_no_update
    BEFORE UPDATE ON title_escrow_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_title_escrow_events_modification();

DROP TRIGGER IF EXISTS trg_title_escrow_events_no_delete ON title_escrow_events;
CREATE TRIGGER trg_title_escrow_events_no_delete
    BEFORE DELETE ON title_escrow_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_title_escrow_events_modification();

-- ============================================================================
-- 7. LEGAL FEE CALCULATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_fee_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id),
    property_value DECIMAL(15,2) NOT NULL,
    state TEXT NOT NULL,
    buyer_gender TEXT NOT NULL DEFAULT 'MALE',
    property_type TEXT NOT NULL DEFAULT 'RESIDENTIAL',

    stamp_duty_rate DECIMAL(5,2) NOT NULL,
    stamp_duty_amount DECIMAL(15,2) NOT NULL,
    registration_fee_rate DECIMAL(5,2) NOT NULL,
    registration_fee_amount DECIMAL(15,2) NOT NULL,
    tds_applicable BOOLEAN DEFAULT FALSE,
    tds_rate DECIMAL(5,2) DEFAULT 0,
    tds_amount DECIMAL(15,2) DEFAULT 0,
    total_statutory_charges DECIMAL(15,2) NOT NULL,

    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_legal_fee_positive CHECK (
        stamp_duty_amount >= 0 AND
        registration_fee_amount >= 0 AND
        tds_amount >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_legal_fee_calculations_deal
    ON legal_fee_calculations(deal_id);
