-- Migration: 023_agreements_evidence.sql
-- Purpose: Phase 3 — Agreements, legal artifacts & dispute evidence
-- Date: 2026-02-17

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Agreement type (deal-level, not transaction-level)
CREATE TYPE agreement_type AS ENUM (
    'TOKEN',        -- Token payment agreement (before TOKEN_PAID → AGREEMENT_SIGNED)
    'SALE',         -- Sale deed / agreement to sell (before AGREEMENT_SIGNED → REGISTRATION)
    'COMMISSION'    -- Commission agreement (agent/platform split)
);

-- Agreement status
CREATE TYPE agreement_status AS ENUM (
    'DRAFT',    -- Created, not yet signed
    'SIGNED',   -- All required parties signed — IMMUTABLE
    'VOID'      -- Voided by admin with reason
);

-- Evidence type for disputes
CREATE TYPE evidence_type AS ENUM (
    'AGREEMENT',        -- Agreement PDF
    'PAYMENT_PROOF',    -- Payment receipt / screenshot
    'COMMUNICATION',    -- Chat export, email metadata
    'ADMIN_NOTE',       -- Admin-attached internal note
    'PHOTO',            -- Property / verification photo
    'OTHER'
);

-- New deal event types for agreement tracking
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'AGREEMENT_CREATED';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'AGREEMENT_ACCEPTED';
ALTER TYPE deal_event_type ADD VALUE IF NOT EXISTS 'AGREEMENT_VOIDED';

-- ============================================================================
-- AGREEMENTS TABLE
-- ============================================================================

CREATE TABLE agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Link to deal (the orchestration spine)
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE RESTRICT,

    -- Agreement classification
    agreement_type agreement_type NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,

    -- Document
    document_url TEXT,
    file_hash TEXT,          -- SHA-256 for tamper detection

    -- Signing timestamps + IP (legally significant)
    signed_by_buyer_at TIMESTAMP,
    signed_by_seller_at TIMESTAMP,
    signed_by_agent_at TIMESTAMP,
    buyer_ip TEXT,
    seller_ip TEXT,
    agent_ip TEXT,

    -- Status
    status agreement_status NOT NULL DEFAULT 'DRAFT',

    -- Void tracking (admin only)
    voided_by UUID REFERENCES users(id),
    void_reason TEXT,
    voided_at TIMESTAMP,

    -- Immutable creation timestamp
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_void_requires_reason CHECK (
        (status != 'VOID') OR (void_reason IS NOT NULL AND voided_by IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_agreements_deal ON agreements(deal_id);
CREATE INDEX idx_agreements_type ON agreements(deal_id, agreement_type);
CREATE INDEX idx_agreements_status ON agreements(status);

-- Unique: Only ONE non-void agreement per deal + type + version
CREATE UNIQUE INDEX idx_unique_agreement_version 
    ON agreements(deal_id, agreement_type, version)
    WHERE status != 'VOID';

-- ============================================================================
-- IMMUTABILITY TRIGGER — BLOCK UPDATE ON SIGNED AGREEMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_signed_agreement_modification()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow voiding a SIGNED agreement (admin action)
    IF OLD.status = 'SIGNED' AND NEW.status = 'VOID' THEN
        RETURN NEW;
    END IF;

    -- Block any other modification to SIGNED agreements
    IF OLD.status = 'SIGNED' THEN
        RAISE EXCEPTION 'Cannot modify a SIGNED agreement. Agreements are immutable after signing. Void the agreement instead.';
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_agreements_immutable
    BEFORE UPDATE ON agreements
    FOR EACH ROW
    EXECUTE FUNCTION prevent_signed_agreement_modification();

-- Block DELETE on agreements entirely
CREATE OR REPLACE FUNCTION prevent_agreement_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Agreements cannot be deleted. They are legal artifacts.';
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_agreements_no_delete
    BEFORE DELETE ON agreements
    FOR EACH ROW
    EXECUTE FUNCTION prevent_agreement_deletion();

-- ============================================================================
-- DISPUTE EVIDENCE TABLE (APPEND-ONLY)
-- ============================================================================

CREATE TABLE dispute_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Links
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE RESTRICT,
    deal_id UUID REFERENCES deals(id),

    -- Evidence details
    evidence_type evidence_type NOT NULL,
    file_url TEXT NOT NULL,
    file_hash TEXT,          -- SHA-256 for integrity
    description TEXT,

    -- Uploader
    uploaded_by UUID NOT NULL REFERENCES users(id),

    -- Immutable timestamp
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()

    -- NO updated_at — append-only
);

-- Indexes
CREATE INDEX idx_dispute_evidence_dispute ON dispute_evidence(dispute_id);
CREATE INDEX idx_dispute_evidence_deal ON dispute_evidence(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_dispute_evidence_type ON dispute_evidence(evidence_type);

-- Immutability: Block UPDATE and DELETE on evidence
CREATE OR REPLACE FUNCTION prevent_evidence_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'dispute_evidence is immutable. UPDATE and DELETE operations are not allowed.';
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_evidence_no_update
    BEFORE UPDATE ON dispute_evidence
    FOR EACH ROW
    EXECUTE FUNCTION prevent_evidence_modification();

CREATE TRIGGER trg_evidence_no_delete
    BEFORE DELETE ON dispute_evidence
    FOR EACH ROW
    EXECUTE FUNCTION prevent_evidence_modification();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agreements IS 'Versioned, immutable legal agreements linked to deals. SIGNED agreements cannot be modified — only voided by admin.';
COMMENT ON TABLE dispute_evidence IS 'Immutable evidence attachments for disputes. Append-only — no UPDATE or DELETE.';

COMMENT ON COLUMN agreements.version IS 'Append-only versioning. New version = new row. Old versions remain for audit.';
COMMENT ON COLUMN agreements.file_hash IS 'SHA-256 hash of document file for tamper detection';
COMMENT ON COLUMN agreements.buyer_ip IS 'IP address of buyer at time of signing — legally significant';

COMMENT ON COLUMN dispute_evidence.file_hash IS 'SHA-256 hash for evidence integrity verification';
COMMENT ON COLUMN dispute_evidence.evidence_type IS 'AGREEMENT, PAYMENT_PROOF, COMMUNICATION, ADMIN_NOTE, PHOTO, OTHER';
