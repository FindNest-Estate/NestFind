-- Migration: 021_deal_schema.sql
-- Purpose: Create the unified DEAL entity — single orchestration spine for the entire transaction lifecycle
-- Date: 2026-02-17

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Deal Status Enum — full lifecycle
CREATE TYPE deal_status AS ENUM (
    'INITIATED',            -- Buyer expressed interest, deal created
    'VISIT_SCHEDULED',      -- Visit booked for this deal
    'OFFER_MADE',           -- Buyer submitted a price offer
    'NEGOTIATION',          -- Counter-offers in progress
    'PRICE_AGREED',         -- Both parties agreed on price
    'TOKEN_PENDING',        -- Awaiting 0.1% token payment
    'TOKEN_PAID',           -- Token paid, property reserved
    'AGREEMENT_SIGNED',     -- Sale agreement executed
    'REGISTRATION',         -- Registration at sub-registrar
    'COMPLETED',            -- Registration done, property transferred
    'COMMISSION_RELEASED',  -- Platform + agent commission distributed
    'CANCELLED',            -- Deal cancelled by participant
    'EXPIRED'               -- Deal expired due to timeout
);

-- Deal Event Type Enum
CREATE TYPE deal_event_type AS ENUM (
    'DEAL_CREATED',
    'STATUS_CHANGED',
    'VISIT_LINKED',
    'OFFER_LINKED',
    'RESERVATION_LINKED',
    'TRANSACTION_LINKED',
    'PRICE_UPDATED',
    'NOTE_ADDED',
    'CANCELLED',
    'EXPIRED',
    'ADMIN_OVERRIDE'
);

-- ============================================================================
-- ADD UNDER_DEAL TO PROPERTY STATUS
-- ============================================================================

-- Irreversible enum addition — accepted for core domain concept
ALTER TYPE property_status ADD VALUE IF NOT EXISTS 'UNDER_DEAL' AFTER 'ACTIVE';

-- ============================================================================
-- DEALS TABLE
-- ============================================================================

CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core References
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES agent_profiles(user_id) ON DELETE RESTRICT,

    -- Lifecycle Status
    status deal_status NOT NULL DEFAULT 'INITIATED',

    -- Linked Entities (populated as deal progresses)
    visit_request_id UUID REFERENCES visit_requests(id) ON DELETE SET NULL,
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

    -- Financial
    agreed_price DECIMAL(15,2),
    token_amount DECIMAL(15,2),
    commission_amount DECIMAL(15,2),
    platform_fee DECIMAL(15,2),
    agent_commission DECIMAL(15,2),

    -- Ownership Snapshots (JSONB) — frozen at deal creation for legal compliance
    -- Contains: id, full_name, email, mobile_number at time of deal creation
    buyer_snapshot JSONB NOT NULL DEFAULT '{}',
    seller_snapshot JSONB NOT NULL DEFAULT '{}',
    agent_snapshot JSONB NOT NULL DEFAULT '{}',

    -- Cancellation / Expiry
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    expired_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_different_deal_parties CHECK (buyer_id != seller_id),
    CONSTRAINT chk_agreed_price_positive CHECK (agreed_price IS NULL OR agreed_price > 0),
    CONSTRAINT chk_token_amount_positive CHECK (token_amount IS NULL OR token_amount > 0),
    CONSTRAINT chk_commission_positive CHECK (commission_amount IS NULL OR commission_amount > 0)
);

-- Indexes
CREATE INDEX idx_deals_property ON deals(property_id);
CREATE INDEX idx_deals_buyer ON deals(buyer_id);
CREATE INDEX idx_deals_seller ON deals(seller_id);
CREATE INDEX idx_deals_agent ON deals(agent_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_created ON deals(created_at);

-- Unique constraint: Only ONE active deal per property
-- Active = NOT in terminal states (COMPLETED, COMMISSION_RELEASED, CANCELLED, EXPIRED)
CREATE UNIQUE INDEX idx_unique_active_deal_per_property ON deals(property_id)
    WHERE status NOT IN ('COMPLETED', 'COMMISSION_RELEASED', 'CANCELLED', 'EXPIRED');

-- ============================================================================
-- DEAL_EVENTS TABLE (IMMUTABLE)
-- ============================================================================

CREATE TABLE deal_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE RESTRICT,

    -- Event Details
    event_type deal_event_type NOT NULL,
    from_status deal_status,
    to_status deal_status,

    -- Actor
    actor_id UUID NOT NULL REFERENCES users(id),
    actor_role TEXT NOT NULL,  -- 'BUYER', 'SELLER', 'AGENT', 'ADMIN', 'SYSTEM'

    -- Details
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Immutable timestamp
    created_at TIMESTAMP NOT NULL DEFAULT NOW()

    -- NO updated_at — this table is append-only
);

-- Indexes
CREATE INDEX idx_deal_events_deal ON deal_events(deal_id);
CREATE INDEX idx_deal_events_type ON deal_events(event_type);
CREATE INDEX idx_deal_events_actor ON deal_events(actor_id);
CREATE INDEX idx_deal_events_created ON deal_events(created_at);

-- ============================================================================
-- IMMUTABILITY ENFORCEMENT — BLOCK UPDATE/DELETE ON deal_events
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_deal_event_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'deal_events table is immutable. UPDATE and DELETE operations are not allowed.';
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_deal_events_no_update
    BEFORE UPDATE ON deal_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_deal_event_modification();

CREATE TRIGGER trg_deal_events_no_delete
    BEFORE DELETE ON deal_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_deal_event_modification();

-- ============================================================================
-- UPDATED_AT TRIGGER FOR DEALS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_deals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_deals_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE deals IS 'Unified deal entity — single orchestration spine for the entire property transaction lifecycle';
COMMENT ON TABLE deal_events IS 'Immutable event log for deal timeline — UPDATE/DELETE blocked by trigger';

COMMENT ON COLUMN deals.status IS 'INITIATED → VISIT_SCHEDULED → OFFER_MADE → NEGOTIATION → PRICE_AGREED → TOKEN_PENDING → TOKEN_PAID → AGREEMENT_SIGNED → REGISTRATION → COMPLETED → COMMISSION_RELEASED';
COMMENT ON COLUMN deals.buyer_snapshot IS 'Frozen buyer profile at deal creation time — for legal disputes';
COMMENT ON COLUMN deals.seller_snapshot IS 'Frozen seller profile at deal creation time — for legal disputes';
COMMENT ON COLUMN deals.agent_snapshot IS 'Frozen agent profile at deal creation time — for legal disputes';

COMMENT ON COLUMN deal_events.actor_role IS 'One of: BUYER, SELLER, AGENT, ADMIN, SYSTEM';
