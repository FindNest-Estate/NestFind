-- ============================================================================
-- Migration: 039_trust_fraud_engine.sql
-- Purpose:   Schema additions for the Trust, Fraud Detection & Risk Scoring Engine
-- Date:      2026-03-18
-- ============================================================================

-- ============================================================================
-- 1. USER KYC COLUMNS (needed for Owner Verification score component)
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pan_verified BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 2. EXTENDED PROPERTY TRUST SCORE COLUMNS
-- ============================================================================
ALTER TABLE property_trust_scores
    ADD COLUMN IF NOT EXISTS score_label TEXT DEFAULT 'MODERATE',
    ADD COLUMN IF NOT EXISTS owner_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS document_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS agent_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS history_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fraud_penalty INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS community_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_computed_at TIMESTAMP;

-- ============================================================================
-- 3. EXTENDED AGENT VERIFICATION SCORE COLUMNS
-- ============================================================================
ALTER TABLE agent_verification_scores
    ADD COLUMN IF NOT EXISTS score_label TEXT DEFAULT 'RELIABLE',
    ADD COLUMN IF NOT EXISTS verification_quality_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deal_performance_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS buyer_satisfaction_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS compliance_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_computed_at TIMESTAMP;

-- ============================================================================
-- 4. EXTEND FRAUD SIGNALS TABLE WITH METADATA
-- ============================================================================
ALTER TABLE property_fraud_signals
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS detector_name TEXT;

-- ============================================================================
-- 5. TRUST / FRAUD EVENT LOG (immutable audit trail for score changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trust_score_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    entity_type TEXT NOT NULL,     -- 'PROPERTY' or 'AGENT'
    entity_id UUID NOT NULL,

    event_type TEXT NOT NULL,      -- 'SCORE_COMPUTED', 'SIGNAL_CREATED', 'SIGNAL_RESOLVED'
    old_score INT,
    new_score INT,

    trigger_source TEXT,           -- 'PROPERTY_SUBMISSION', 'VERIFICATION', 'DEAL_COMPLETED', etc.
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_score_events_entity
    ON trust_score_events(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_trust_score_events_type
    ON trust_score_events(event_type);

CREATE INDEX IF NOT EXISTS idx_trust_score_events_created
    ON trust_score_events(created_at DESC);

-- ============================================================================
-- 6. PERFORMANCE INDEXES
-- ============================================================================

-- Partial index for fast unresolved signal lookups
CREATE INDEX IF NOT EXISTS idx_fraud_signals_property_active
    ON property_fraud_signals(property_id)
    WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_fraud_signals_severity
    ON property_fraud_signals(severity);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_signal_type
    ON property_fraud_signals(signal_type);

-- Composite index for fraud signal queries
CREATE INDEX IF NOT EXISTS idx_fraud_signals_property_resolved
    ON property_fraud_signals(property_id, resolved, created_at DESC);

-- Trust score ordering index (for leaderboard / risk dashboard)
CREATE INDEX IF NOT EXISTS idx_trust_scores_score
    ON property_trust_scores(trust_score);

CREATE INDEX IF NOT EXISTS idx_agent_scores_score
    ON agent_verification_scores(trust_score);

-- Duplicate detection lookup
CREATE INDEX IF NOT EXISTS idx_duplicate_detection_property
    ON duplicate_property_detection(property_id);
