-- ============================================================================
-- Migration 024: SLA Infrastructure
-- Phase 5 — Operational Hardening, SLAs & Escalation
--
-- Tables:
--   sla_configs: Admin-configurable SLA thresholds per deal state
--   sla_breaches: Append-only breach records (WARNING, ESCALATION)
--   notification_intents: Queued notification signals with severity
-- ============================================================================

-- ============================================================================
-- 1. SLA CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sla_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Which deal state this SLA applies to
    deal_state TEXT NOT NULL UNIQUE,
    
    -- Thresholds (in days)
    max_days INTEGER NOT NULL DEFAULT 7,
    notify_after_days INTEGER NOT NULL DEFAULT 3,
    escalate_after_days INTEGER NOT NULL DEFAULT 7,
    
    -- Who is responsible when this SLA breaches
    responsible_role TEXT NOT NULL DEFAULT 'AGENT',
    
    -- Admin control
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_sla_days CHECK (notify_after_days <= escalate_after_days),
    CONSTRAINT chk_sla_max CHECK (escalate_after_days <= max_days)
);

-- ============================================================================
-- 2. SLA BREACH RECORDS (APPEND-ONLY UNTIL RESOLVED)
-- ============================================================================

CREATE TYPE sla_breach_type AS ENUM ('WARNING', 'ESCALATION');

CREATE TABLE IF NOT EXISTS sla_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    deal_id UUID NOT NULL REFERENCES deals(id),
    deal_state TEXT NOT NULL,
    breach_type sla_breach_type NOT NULL,
    
    -- Who is responsible
    responsible_role TEXT NOT NULL,
    responsible_user_id UUID REFERENCES users(id),
    
    -- Context
    days_in_state NUMERIC(6,1) NOT NULL,
    sla_threshold_days INTEGER NOT NULL,
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,  -- 'SYSTEM' (auto-resolved on state change) or admin UUID
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate breaches per deal + state + type
    CONSTRAINT uq_sla_breach_deal_state_type 
        UNIQUE (deal_id, deal_state, breach_type)
);

CREATE INDEX IF NOT EXISTS idx_sla_breaches_deal ON sla_breaches(deal_id);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_unresolved ON sla_breaches(resolved_at) WHERE resolved_at IS NULL;

-- ============================================================================
-- 3. NOTIFICATION INTENTS (QUEUED SIGNALS)
-- ============================================================================

CREATE TYPE notification_severity AS ENUM ('INFO', 'WARNING', 'URGENT', 'CRITICAL');

CREATE TABLE IF NOT EXISTS notification_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target
    deal_id UUID REFERENCES deals(id),
    target_user_id UUID NOT NULL REFERENCES users(id),
    target_role TEXT NOT NULL,
    
    -- Content
    message_type TEXT NOT NULL,
    severity notification_severity NOT NULL DEFAULT 'INFO',
    title TEXT NOT NULL,
    body TEXT,
    
    -- Delivery tracking
    delivered BOOLEAN NOT NULL DEFAULT false,
    delivered_at TIMESTAMPTZ,
    
    -- Source
    source TEXT NOT NULL DEFAULT 'SLA_CHECKER',
    source_breach_id UUID REFERENCES sla_breaches(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_intents_target ON notification_intents(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_intents_undelivered ON notification_intents(delivered) WHERE delivered = false;

-- ============================================================================
-- 4. DEFAULT SLA CONFIGURATIONS
-- ============================================================================

INSERT INTO sla_configs (deal_state, max_days, notify_after_days, escalate_after_days, responsible_role) VALUES
    ('INITIATED',          5,  2,  5,  'AGENT'),
    ('VISIT_SCHEDULED',    7,  3,  7,  'AGENT'),
    ('OFFER_MADE',         5,  2,  5,  'SELLER'),
    ('NEGOTIATION',       10,  5, 10,  'AGENT'),
    ('PRICE_AGREED',       3,  1,  3,  'BUYER'),
    ('TOKEN_PENDING',      3,  1,  3,  'BUYER'),
    ('TOKEN_PAID',         2,  1,  2,  'AGENT'),
    ('AGREEMENT_SIGNED',   5,  2,  5,  'AGENT'),
    ('REGISTRATION',      14,  7, 14,  'AGENT'),
    ('DISPUTED',          14,  7, 14,  'ADMIN')
ON CONFLICT (deal_state) DO NOTHING;

-- ============================================================================
-- 5. UPDATE TRIGGER FOR SLA CONFIGS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sla_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sla_config_updated
    BEFORE UPDATE ON sla_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_sla_config_timestamp();
