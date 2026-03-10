-- Migration: 025_deal_execution_fields.sql
-- Purpose: Phase 3 Execution Readiness - Add fields for compliance proof and registration scheduling
-- Date: 2026-02-17

-- 1. Add proof_url to reservations (for Booking Amount Proof)
ALTER TABLE reservations 
    ADD COLUMN IF NOT EXISTS proof_url TEXT,
    ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS proof_uploaded_by UUID REFERENCES users(id);

COMMENT ON COLUMN reservations.proof_url IS 'URL to the booking amount proof (receipt/screenshot)';

-- 2. Add implementation readiness fields to deals
ALTER TABLE deals
    ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS registration_notes TEXT,
    ADD COLUMN IF NOT EXISTS execution_stage VARCHAR(50) DEFAULT 'AWAITING_DOCS'; 
    -- execution_stage can be: AWAITING_DOCS, DOCS_REVIEW, READY_FOR_REGISTRATION, etc.
    -- This allows UI sub-status derivation without mutating the main status too early.

COMMENT ON COLUMN deals.registration_date IS 'Scheduled date for property registration';
COMMENT ON COLUMN deals.execution_stage IS 'Sub-status for Deal Execution phase (Phase 3)';
