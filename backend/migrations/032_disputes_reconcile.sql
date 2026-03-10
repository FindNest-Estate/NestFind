-- Migration: 032_disputes_reconcile.sql
-- Purpose: Reconcile live disputes table (from migration 009) with the columns
--          that dispute_service.py and the Phase 4B/5A service code requires.
--
-- Background:
--   * 009_dispute_audit_schema.sql created disputes with: category (enum),
--     evidence_urls TEXT[], resolution_notes TEXT, raised_by_id UUID.
--   * 027_disputes_schema.sql ran CREATE TABLE IF NOT EXISTS — a no-op because
--     the table already existed, so 027's columns (type TEXT, admin_notes, JSONB
--     evidence_urls) were never added.
--   * 022_dispute_deal_integration.sql added deal_id and a few other columns.
--
-- This migration adds the missing columns so the service code works correctly.

-- 1. Add `dispute_type` TEXT column (the service uses d.dispute_type)
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS dispute_type TEXT;

-- Back-fill dispute_type from the existing `category` enum cast
UPDATE disputes SET dispute_type = category::text WHERE dispute_type IS NULL;

-- 2. Add `admin_notes` TEXT column (resolution notes exposed to admins)
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Back-fill from resolution_notes where applicable
UPDATE disputes
    SET admin_notes = resolution_notes
    WHERE admin_notes IS NULL AND resolution_notes IS NOT NULL;

-- 3. Add `resolved_at` with time zone if not already present
--    (009 created it as plain TIMESTAMP; add the tz-aware version if missing)
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 4. Add resolution_entry_id for ledger-linked resolution (Phase 4B)
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS resolution_entry_id UUID REFERENCES ledger_entries(id);

-- 5. Add `raised_by_id` if not present (009 uses raised_by_id ✓ already exists,
--    this is a safety guard)
-- ALTER TABLE disputes ADD COLUMN IF NOT EXISTS raised_by_id UUID REFERENCES users(id);

-- 6. Add JSONB evidence_urls column alongside existing TEXT[] column
--    The service stores/reads JSON-encoded arrays.
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS evidence_urls_jsonb JSONB DEFAULT '[]'::jsonb;

UPDATE disputes
    SET evidence_urls_jsonb = to_jsonb(COALESCE(evidence_urls, ARRAY[]::TEXT[]))
    WHERE evidence_urls_jsonb = '[]'::jsonb OR evidence_urls_jsonb IS NULL;

-- Index for fast deal-based dispute lookup
CREATE INDEX IF NOT EXISTS idx_disputes_deal_id ON disputes(deal_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status_text ON disputes(status);

COMMENT ON COLUMN disputes.dispute_type IS 'Dispute type string; backfilled from category enum for Phase 4B service compatibility.';
COMMENT ON COLUMN disputes.admin_notes IS 'Admin notes on this dispute; synced from resolution_notes.';
COMMENT ON COLUMN disputes.evidence_urls_jsonb IS 'JSONB array of evidence URLs; mirrors evidence_urls TEXT[].';
