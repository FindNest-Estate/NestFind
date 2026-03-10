-- Migration: 022_dispute_deal_integration.sql
-- Purpose: Phase 2.5 — Link disputes to deals, add cancellation/freeze support
-- Date: 2026-02-17

-- ============================================================================
-- ENUM EXTENSIONS
-- ============================================================================

-- Add CANCELLATION category for auto-created disputes
ALTER TYPE dispute_category ADD VALUE IF NOT EXISTS 'CANCELLATION';

-- Add DISPUTED state to deal lifecycle (BLOCKING, not terminal)
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'DISPUTED' AFTER 'COMMISSION_RELEASED';

-- Add new event types for dispute/freeze tracking
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'DISPUTE_CREATED';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'DEAL_FROZEN';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'DEAL_UNFROZEN';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'COMMISSION_CALCULATED';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'TOKEN_FORFEITED';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'REFUND_REQUESTED';

-- ============================================================================
-- DISPUTES TABLE EXTENSIONS
-- ============================================================================

-- Link disputes to the DEAL entity (the orchestration spine)
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id);

-- Track money at stake in the dispute
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS amount_involved DECIMAL(15,2);

-- Flag system-generated disputes (vs user-raised)
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT FALSE;

-- Refund tracking: NULL, PENDING, APPROVED, FORFEITED
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT NULL;

-- Index for deal-linked disputes
CREATE INDEX IF NOT EXISTS idx_disputes_deal ON disputes(deal_id) WHERE deal_id IS NOT NULL;

-- ============================================================================
-- DEALS TABLE EXTENSIONS
-- ============================================================================

-- Store the state the deal was in BEFORE being frozen/disputed
-- Needed for admin resolution to resume or cancel correctly
ALTER TABLE deals ADD COLUMN IF NOT EXISTS pre_dispute_status TEXT DEFAULT NULL;

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure refund_status values are valid
ALTER TABLE disputes ADD CONSTRAINT chk_refund_status 
    CHECK (refund_status IS NULL OR refund_status IN ('PENDING', 'APPROVED', 'FORFEITED', 'PARTIAL'));

-- Update the related entity constraint to include deal_id
-- (Drop old constraint first, then re-add with deal_id)
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS chk_has_related_entity;
ALTER TABLE disputes ADD CONSTRAINT chk_has_related_entity CHECK (
    property_id IS NOT NULL OR 
    transaction_id IS NOT NULL OR 
    visit_id IS NOT NULL OR 
    offer_id IS NOT NULL OR
    deal_id IS NOT NULL
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN disputes.deal_id IS 'Link to the deal entity — required for auto-created cancellation disputes';
COMMENT ON COLUMN disputes.amount_involved IS 'Money at stake in the dispute (token amount, commission, etc.)';
COMMENT ON COLUMN disputes.auto_created IS 'TRUE if system auto-created due to cancellation/penalty rules';
COMMENT ON COLUMN disputes.refund_status IS 'NULL = no refund, PENDING = awaiting admin, APPROVED = refunded, FORFEITED = buyer lost token';
COMMENT ON COLUMN deals.pre_dispute_status IS 'Deal status before DISPUTED freeze — used for admin resolution to resume or cancel';
