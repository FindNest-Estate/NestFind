-- Migration: 028_phase5a_commission_lifecycle.sql
-- Purpose: Phase 5A — Commission lifecycle, counterparty confirmation, new dispute types
-- Date: 2026-02-17

-- ============================================================================
-- 1. COMMISSION LIFECYCLE FIELDS ON FINANCIAL_LEDGERS
-- ============================================================================

ALTER TABLE financial_ledgers
    ADD COLUMN IF NOT EXISTS commission_status VARCHAR(30) DEFAULT 'CALCULATED',
    ADD COLUMN IF NOT EXISTS cooling_off_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS settlement_authorized_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS settlement_authorized_at TIMESTAMPTZ;

-- Add CHECK constraint for commission_status
-- Using DO block for idempotency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_commission_status'
    ) THEN
        ALTER TABLE financial_ledgers
        ADD CONSTRAINT chk_commission_status
        CHECK (commission_status IN (
            'CALCULATED', 'EARNED', 'COOLING_OFF', 'PAYABLE',
            'SETTLEMENT_PENDING', 'SETTLED', 'VOIDED', 'FROZEN'
        ));
    END IF;
END $$;

COMMENT ON COLUMN financial_ledgers.commission_status IS 'Commission lifecycle: CALCULATED → EARNED → COOLING_OFF → PAYABLE → SETTLEMENT_PENDING → SETTLED (or VOIDED/FROZEN)';
COMMENT ON COLUMN financial_ledgers.cooling_off_expires_at IS '7-day cooling-off countdown after deal COMPLETED';

-- ============================================================================
-- 2. COUNTERPARTY CONFIRMATION ON LEDGER_ENTRIES
-- ============================================================================

ALTER TABLE ledger_entries
    ADD COLUMN IF NOT EXISTS counterparty_confirmed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS counterparty_confirmed_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS counterparty_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN ledger_entries.counterparty_confirmed IS 'Whether the other party has confirmed this payment event';

-- ============================================================================
-- 3. NEW DEAL EVENT TYPES
-- ============================================================================

-- These are safe irreversible enum additions
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'COMMISSION_EARNED';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'COMMISSION_AUTHORIZED';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'PAYMENT_CONFIRMED';

-- ============================================================================
-- 4. EXPAND DISPUTE TYPES
-- ============================================================================

-- Drop and re-add the CHECK constraint to include new types
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_type_check;
ALTER TABLE disputes ADD CONSTRAINT disputes_type_check
    CHECK (type IN (
        'BOOKING_PROOF_DISPUTED', 'AMOUNT_MISMATCH', 'COMMISSION_DISPUTE',
        'DOCUMENT_INCOMPLETE', 'OTHER',
        -- Phase 5A additions
        'AGENT_MISCONDUCT', 'PAYMENT_NOT_RECEIVED', 'FORFEITURE_DISPUTE'
    ));

-- ============================================================================
-- 5. INDEXES FOR NEW FIELDS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_financial_ledgers_commission_status
    ON financial_ledgers(commission_status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_counterparty_confirmed
    ON ledger_entries(counterparty_confirmed) WHERE counterparty_confirmed = FALSE;
