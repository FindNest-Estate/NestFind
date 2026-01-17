-- Migration: 009_dispute_audit_schema.sql
-- Purpose: Create dispute and audit logging tables
-- Date: 2026-01-05

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Dispute Status Enum
CREATE TYPE dispute_status AS ENUM (
    'OPEN',           -- Dispute raised
    'UNDER_REVIEW',   -- Admin reviewing
    'RESOLVED',       -- Admin made decision
    'CLOSED'          -- Dispute closed
);

-- Dispute Decision Enum
CREATE TYPE dispute_decision AS ENUM (
    'FAVOR_BUYER',
    'FAVOR_SELLER',
    'FAVOR_AGENT',
    'NO_ACTION',
    'PARTIAL_REFUND'
);

-- Dispute Category Enum
CREATE TYPE dispute_category AS ENUM (
    'PROPERTY_MISREPRESENTATION',
    'PAYMENT_ISSUE',
    'AGENT_MISCONDUCT',
    'VISIT_ISSUE',
    'VERIFICATION_ISSUE',
    'OTHER'
);

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parties
    raised_by_id UUID NOT NULL REFERENCES users(id),
    against_id UUID NOT NULL REFERENCES users(id),
    
    -- Related Entities (at least one required)
    property_id UUID REFERENCES properties(id),
    transaction_id UUID REFERENCES transactions(id),
    visit_id UUID REFERENCES visit_requests(id),
    offer_id UUID REFERENCES offers(id),
    
    -- Dispute Details
    category dispute_category NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Evidence
    evidence_urls TEXT[],  -- Array of file URLs
    
    -- Status
    status dispute_status NOT NULL DEFAULT 'OPEN',
    
    -- Admin Resolution
    assigned_admin_id UUID REFERENCES users(id),
    decision dispute_decision,
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_different_parties CHECK (raised_by_id != against_id),
    CONSTRAINT chk_has_related_entity CHECK (
        property_id IS NOT NULL OR 
        transaction_id IS NOT NULL OR 
        visit_id IS NOT NULL OR 
        offer_id IS NOT NULL
    )
);

-- Disputes Indexes
CREATE INDEX idx_disputes_raised_by ON disputes(raised_by_id);
CREATE INDEX idx_disputes_against ON disputes(against_id);
CREATE INDEX idx_disputes_property ON disputes(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_disputes_transaction ON disputes(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_category ON disputes(category);
CREATE INDEX idx_disputes_assigned_admin ON disputes(assigned_admin_id) WHERE assigned_admin_id IS NOT NULL;

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Actor Information
    user_id UUID REFERENCES users(id),
    user_role TEXT,  -- Role at time of action
    
    -- Action Details
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    
    -- Request Context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    
    -- Change Details
    old_values JSONB,
    new_values JSONB,
    
    -- Timestamp (immutable)
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Note: No updated_at - audit logs are immutable
    CONSTRAINT chk_action_not_empty CHECK (action != ''),
    CONSTRAINT chk_entity_type_not_empty CHECK (entity_type != '')
);

-- Audit Logs Indexes (optimized for queries)
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_ip ON audit_logs(ip_address);

-- Partitioning hint: Consider partitioning by created_at for large datasets

-- ============================================================================
-- ADMIN_ACTIONS TABLE
-- ============================================================================

CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    
    -- Action Details
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,  -- 'user', 'agent', 'property', 'dispute'
    target_id UUID NOT NULL,
    
    -- Reason (required for admin actions)
    reason TEXT NOT NULL,
    
    -- Previous/New State
    previous_state TEXT,
    new_state TEXT,
    
    -- Timestamp
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_admin_action_not_empty CHECK (action != ''),
    CONSTRAINT chk_reason_not_empty CHECK (reason != '')
);

-- Admin Actions Indexes
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for disputes
CREATE OR REPLACE FUNCTION update_disputes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_disputes_updated_at
    BEFORE UPDATE ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_disputes_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE disputes IS 'User-raised disputes requiring admin resolution';
COMMENT ON TABLE audit_logs IS 'Immutable log of all system actions for security auditing';
COMMENT ON TABLE admin_actions IS 'Admin decision and action history';

COMMENT ON COLUMN disputes.status IS 'OPEN → UNDER_REVIEW → RESOLVED → CLOSED';
COMMENT ON COLUMN audit_logs.old_values IS 'JSONB snapshot of entity before change';
COMMENT ON COLUMN audit_logs.new_values IS 'JSONB snapshot of entity after change';
