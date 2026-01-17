-- Migration: 019_transaction_enhancements.sql
-- Purpose: Add slot booking fields, document tracking, and commission adjustments
-- Date: 2026-01-16

-- ============================================================================
-- Add New Transaction Statuses
-- ============================================================================

-- Add new statuses to transaction_status enum
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'SLOT_BOOKED';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'ALL_VERIFIED';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'SELLER_PAID';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'DOCUMENTS_PENDING';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'ADMIN_REVIEW';

-- ============================================================================
-- Slot Booking Fields
-- ============================================================================

ALTER TABLE transactions 
    ADD COLUMN IF NOT EXISTS registration_time TIME,
    ADD COLUMN IF NOT EXISTS office_name TEXT,
    ADD COLUMN IF NOT EXISTS office_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS office_lng DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS booking_reference TEXT,
    ADD COLUMN IF NOT EXISTS slot_booked_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS slot_booked_by UUID REFERENCES users(id);

-- ============================================================================
-- Agreement Signing Tracking
-- ============================================================================

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS buyer_signed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS seller_signed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS agent_signed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS agreement_pdf_url TEXT;

-- ============================================================================
-- Seller Payment Tracking
-- ============================================================================

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS seller_payment_reference TEXT,
    ADD COLUMN IF NOT EXISTS seller_payment_method TEXT,
    ADD COLUMN IF NOT EXISTS seller_paid_at TIMESTAMP;

-- ============================================================================
-- Commission Distribution (Corrected Split)
-- ============================================================================

-- Drop old constraint if exists
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_commission_amounts;

-- Update column comments with correct split
COMMENT ON COLUMN transactions.platform_fee IS '0.2% of property price from seller + 0.1% from buyer = 0.3% total to NestFind';
COMMENT ON COLUMN transactions.agent_commission IS '0.7% of property price (from sellers 0.9%) to agent after taxes';

-- ============================================================================
-- Transaction Documents Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users(id),
    uploader_role VARCHAR(10) NOT NULL CHECK (uploader_role IN ('BUYER', 'SELLER', 'AGENT')),
    
    -- Document Details
    document_type VARCHAR(30) NOT NULL CHECK (document_type IN (
        'NESTFIND_AGREEMENT',
        'REGISTRATION_CERTIFICATE',
        'SALE_DEED',
        'VERIFICATION_PHOTO',
        'ID_PROOF',
        'OTHER'
    )),
    file_url TEXT NOT NULL,
    file_name TEXT,
    
    -- Admin Verification
    admin_verified BOOLEAN DEFAULT FALSE,
    admin_verified_by UUID REFERENCES users(id),
    admin_verified_at TIMESTAMP,
    admin_notes TEXT,
    
    -- Timestamps
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_documents_transaction 
    ON transaction_documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_documents_type 
    ON transaction_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_transaction_documents_verified 
    ON transaction_documents(admin_verified) WHERE admin_verified = FALSE;

-- ============================================================================
-- Agent Disbursement Tracking
-- ============================================================================

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS agent_disbursement_reference TEXT,
    ADD COLUMN IF NOT EXISTS agent_disbursed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS admin_approved_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE transaction_documents IS 'Documents uploaded by parties for transaction verification';
COMMENT ON COLUMN transactions.registration_time IS 'Scheduled time slot at registration office';
COMMENT ON COLUMN transactions.office_name IS 'Sub-registrar office name';
COMMENT ON COLUMN transactions.office_lat IS 'GPS lat for agent location verification';
