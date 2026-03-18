-- Migration: 038_payment_engine.sql
-- Purpose: Introduce provider-agnostic payment engine with mock gateway support
-- Date: 2026-03-18

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_type') THEN
        CREATE TYPE payment_intent_type AS ENUM ('RESERVATION', 'COMMISSION', 'ESCROW', 'REFUND');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_status') THEN
        CREATE TYPE payment_intent_status AS ENUM (
            'CREATED',
            'CHECKOUT_INITIATED',
            'AUTHORIZED',
            'CAPTURED',
            'SETTLED',
            'PARTIALLY_REFUNDED',
            'FULLY_REFUNDED',
            'FAILED',
            'TIMED_OUT',
            'EXPIRED',
            'AUTHORIZATION_EXPIRED'
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_transaction_type') THEN
        CREATE TYPE payment_transaction_type AS ENUM ('CAPTURE', 'REFUND', 'SETTLEMENT', 'CHARGEBACK');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_direction') THEN
        CREATE TYPE payment_direction AS ENUM ('CREDIT', 'DEBIT');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_txn_status') THEN
        CREATE TYPE payment_txn_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
        CREATE TYPE refund_status AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reconciliation_status') THEN
        CREATE TYPE reconciliation_status AS ENUM ('PENDING', 'MATCHED', 'DISCREPANCY', 'RESOLVED');
    END IF;
END $$;

-- Reservation starts in PAYMENT_PENDING before token capture.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'PAYMENT_PENDING'
          AND enumtypid = 'reservation_status'::regtype
    ) THEN
        ALTER TYPE reservation_status ADD VALUE 'PAYMENT_PENDING';
    END IF;
END $$;

-- ============================================================================
-- PAYMENT_INTENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    intent_type payment_intent_type NOT NULL,
    reference_id UUID NOT NULL,
    reference_type TEXT NOT NULL,

    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',

    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    provider TEXT NOT NULL,
    provider_order_id TEXT,
    provider_payment_id TEXT,
    checkout_url TEXT,

    status payment_intent_status NOT NULL DEFAULT 'CREATED',

    checkout_initiated_at TIMESTAMP,
    authorized_at TIMESTAMP,
    captured_at TIMESTAMP,
    settled_at TIMESTAMP,
    failed_at TIMESTAMP,
    expired_at TIMESTAMP,

    failure_code TEXT,
    failure_message TEXT,

    expires_at TIMESTAMP NOT NULL,

    provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,

    ip_address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_payment_intent_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_payment_intent_provider CHECK (provider IN ('MOCK', 'RAZORPAY', 'STRIPE')),
    CONSTRAINT chk_payment_intent_reference_type CHECK (char_length(reference_type) > 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_payer ON payment_intents(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_reference ON payment_intents(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_provider ON payment_intents(provider);
CREATE INDEX IF NOT EXISTS idx_payment_intents_expires_at ON payment_intents(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_unique_active_reference
    ON payment_intents(reference_type, reference_id)
    WHERE status NOT IN (
        'CAPTURED',
        'SETTLED',
        'FULLY_REFUNDED',
        'FAILED',
        'TIMED_OUT',
        'EXPIRED',
        'AUTHORIZATION_EXPIRED'
    );

-- ============================================================================
-- PAYMENT_TRANSACTIONS (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,

    transaction_type payment_transaction_type NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    direction payment_direction NOT NULL,

    provider_txn_id TEXT,
    provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,

    status payment_txn_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_payment_txn_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_intent ON payment_transactions(intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(transaction_type);

-- ============================================================================
-- PAYMENT_WEBHOOKS (raw payload immutable, processing metadata mutable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    raw_payload JSONB NOT NULL,

    signature TEXT,
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,

    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMP,
    processing_error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_retry_at TIMESTAMP,

    idempotency_key TEXT UNIQUE,

    received_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_payment_webhooks_provider CHECK (provider IN ('MOCK', 'RAZORPAY', 'STRIPE')),
    CONSTRAINT chk_payment_webhooks_retry_count CHECK (retry_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_retry
    ON payment_webhooks(processed, retry_count, received_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_type ON payment_webhooks(event_type);

-- ============================================================================
-- REFUNDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE RESTRICT,

    amount DECIMAL(15,2) NOT NULL,
    reason TEXT NOT NULL,

    status refund_status NOT NULL DEFAULT 'REQUESTED',

    provider_refund_id TEXT,
    provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,

    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,

    CONSTRAINT chk_refund_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_refunds_intent ON refunds(intent_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_requested_by ON refunds(requested_by);

-- ============================================================================
-- PROVIDER_CONFIGURATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT UNIQUE NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    config JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_provider_configurations_provider CHECK (provider IN ('MOCK', 'RAZORPAY', 'STRIPE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_configurations_single_default
    ON provider_configurations(is_default)
    WHERE is_default = TRUE;

-- ============================================================================
-- PAYMENT_EVENTS (immutable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE RESTRICT,

    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,

    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type TEXT NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_intent ON payment_events(intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at);

-- ============================================================================
-- RECONCILIATION_REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    report_date DATE NOT NULL,
    provider TEXT NOT NULL,

    total_captured DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_settled DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_refunded DECIMAL(15,2) NOT NULL DEFAULT 0,
    discrepancy_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    status reconciliation_status NOT NULL DEFAULT 'PENDING',

    details JSONB NOT NULL DEFAULT '[]'::jsonb,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_reconciliation_provider CHECK (provider IN ('MOCK', 'RAZORPAY', 'STRIPE')),
    CONSTRAINT chk_reconciliation_unique_by_day UNIQUE (report_date, provider)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_status ON reconciliation_reports(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_provider_date ON reconciliation_reports(provider, report_date);

-- ============================================================================
-- SUPPORT COLUMNS FOR INTEGRATION
-- ============================================================================

ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL;

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS commission_payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_payment_intent_id ON reservations(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_commission_payment_intent_id ON transactions(commission_payment_intent_id);

-- ============================================================================
-- TIMESTAMP TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_payment_intents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_payment_intents_updated_at ON payment_intents;
CREATE TRIGGER trg_payment_intents_updated_at
    BEFORE UPDATE ON payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_intents_timestamp();

CREATE OR REPLACE FUNCTION update_provider_configurations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_provider_configurations_updated_at ON provider_configurations;
CREATE TRIGGER trg_provider_configurations_updated_at
    BEFORE UPDATE ON provider_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_configurations_timestamp();

-- ============================================================================
-- IMMUTABILITY TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_payment_events_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'payment_events table is immutable. UPDATE and DELETE operations are not allowed.';
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_payment_events_no_update ON payment_events;
CREATE TRIGGER trg_payment_events_no_update
    BEFORE UPDATE ON payment_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_payment_events_modification();

DROP TRIGGER IF EXISTS trg_payment_events_no_delete ON payment_events;
CREATE TRIGGER trg_payment_events_no_delete
    BEFORE DELETE ON payment_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_payment_events_modification();

CREATE OR REPLACE FUNCTION prevent_payment_transactions_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'payment_transactions table is append-only. UPDATE and DELETE operations are not allowed.';
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_payment_transactions_no_update ON payment_transactions;
CREATE TRIGGER trg_payment_transactions_no_update
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_payment_transactions_modification();

DROP TRIGGER IF EXISTS trg_payment_transactions_no_delete ON payment_transactions;
CREATE TRIGGER trg_payment_transactions_no_delete
    BEFORE DELETE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_payment_transactions_modification();

CREATE OR REPLACE FUNCTION enforce_payment_webhook_payload_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.provider IS DISTINCT FROM OLD.provider)
       OR (NEW.event_type IS DISTINCT FROM OLD.event_type)
       OR (NEW.raw_payload IS DISTINCT FROM OLD.raw_payload)
       OR (NEW.signature IS DISTINCT FROM OLD.signature)
       OR (NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key)
       OR (NEW.received_at IS DISTINCT FROM OLD.received_at) THEN
        RAISE EXCEPTION 'Raw webhook columns are immutable once inserted.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_payment_webhooks_payload_immutable ON payment_webhooks;
CREATE TRIGGER trg_payment_webhooks_payload_immutable
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION enforce_payment_webhook_payload_immutability();

CREATE OR REPLACE FUNCTION prevent_payment_webhooks_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'payment_webhooks table is append-only. DELETE operations are not allowed.';
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_payment_webhooks_no_delete ON payment_webhooks;
CREATE TRIGGER trg_payment_webhooks_no_delete
    BEFORE DELETE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION prevent_payment_webhooks_delete();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE payment_intents IS 'Provider-agnostic payment lifecycle record with strict state transitions.';
COMMENT ON TABLE payment_transactions IS 'Append-only money movement records for captures, settlements, and refunds.';
COMMENT ON TABLE payment_webhooks IS 'Raw provider webhook events with immutable payload and mutable processing metadata.';
COMMENT ON TABLE refunds IS 'Refund lifecycle records linked to payment intents.';
COMMENT ON TABLE provider_configurations IS 'Runtime provider configuration. Exactly one provider can be default.';
COMMENT ON TABLE payment_events IS 'Immutable audit timeline for payment intent status transitions.';
COMMENT ON TABLE reconciliation_reports IS 'Daily provider versus platform reconciliation snapshots.';

COMMENT ON COLUMN payment_intents.status IS 'CREATED -> CHECKOUT_INITIATED -> AUTHORIZED -> CAPTURED/FAILED/TIMED_OUT/...';
COMMENT ON COLUMN payment_intents.reference_type IS 'Target entity category: reservation, transaction, deal, etc.';
COMMENT ON COLUMN payment_webhooks.idempotency_key IS 'Unique idempotency key to prevent duplicate webhook processing.';

-- ============================================================================
-- SEED PROVIDER CONFIGURATION (MOCK DEFAULT)
-- ============================================================================

INSERT INTO provider_configurations (provider, is_active, is_default, config)
VALUES (
    'MOCK',
    TRUE,
    TRUE,
    jsonb_build_object(
        'default_scenario', 'SUCCESS',
        'processing_delay_ms', 2000,
        'webhook_secret', 'nestfind_mock_webhook_secret_do_not_use_in_production',
        'webhook_retry_count', 3,
        'webhook_retry_delay_ms', jsonb_build_array(1000, 4000, 16000),
        'auto_capture', true,
        'auto_settle', true,
        'test_otp', '123456',
        'checkout_page_theme', 'nestfind',
        'test_cards', jsonb_build_object(
            '4111111111111111', 'SUCCESS',
            '4000000000000002', 'INSUFFICIENT_FUNDS',
            '4000000000003220', '3DS_REQUIRED',
            '4000000000009995', 'NETWORK_ERROR',
            '4100000000000019', 'FRAUD_BLOCKED'
        )
    )
)
ON CONFLICT (provider)
DO UPDATE SET
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    config = EXCLUDED.config,
    updated_at = NOW();

INSERT INTO provider_configurations (provider, is_active, is_default, config)
VALUES
    ('RAZORPAY', FALSE, FALSE, '{}'::jsonb),
    ('STRIPE', FALSE, FALSE, '{}'::jsonb)
ON CONFLICT (provider) DO NOTHING;
