-- Migration: 033_enterprise_trust_architecture.sql
-- Purpose: Add normalized tables for DB-driven document verification, fraud intelligence, and trust scoring.
-- Date: 2026-03-11

-- ============================================================================
-- 1. DOCUMENT VERIFICATION CONFIGURATION
-- ============================================================================

-- Master list of document types
CREATE TABLE verification_document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed Initial 12 Critical Indian Property Documents
INSERT INTO verification_document_types (code, name, required) VALUES
('SALE_DEED', 'Sale Deed', true),
('ENCUMBRANCE_CERTIFICATE', 'Encumbrance Certificate (EC)', false),
('PROPERTY_TAX_RECEIPT', 'Property Tax Receipt', true),
('OWNER_ID_PROOF', 'Owner Identity Proof', true),
('OWNER_ADDRESS_PROOF', 'Owner Address Proof', false),
('APPROVED_BUILDING_PLAN', 'Approved Building Plan', false),
('COMPLETION_CERTIFICATE', 'Completion Certificate', false),
('OCCUPANCY_CERTIFICATE', 'Occupancy Certificate (OC)', false),
('LAYOUT_APPROVAL', 'Layout Approval', false),
('POWER_OF_ATTORNEY', 'Power of Attorney', false),
('LOAN_CLEARANCE', 'Loan Clearance / Bank NOC', false),
('TITLE_CHAIN', 'Title Chain', false);

-- Map required documents to property types
CREATE TABLE property_document_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_type property_type NOT NULL,
    document_type_id UUID REFERENCES verification_document_types(id) ON DELETE CASCADE,
    required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(property_type, document_type_id)
);

-- Seed Common Requirements (Using IDs fetched during insert or via subqueries)
INSERT INTO property_document_requirements (property_type, document_type_id, required)
SELECT 'LAND', id, true FROM verification_document_types WHERE code IN ('SALE_DEED', 'ENCUMBRANCE_CERTIFICATE', 'LAYOUT_APPROVAL');

INSERT INTO property_document_requirements (property_type, document_type_id, required)
SELECT 'APARTMENT', id, true FROM verification_document_types WHERE code IN ('SALE_DEED', 'OCCUPANCY_CERTIFICATE', 'PROPERTY_TAX_RECEIPT');

INSERT INTO property_document_requirements (property_type, document_type_id, required)
SELECT 'HOUSE', id, true FROM verification_document_types WHERE code IN ('SALE_DEED', 'OCCUPANCY_CERTIFICATE', 'APPROVED_BUILDING_PLAN');

INSERT INTO property_document_requirements (property_type, document_type_id, required)
SELECT 'COMMERCIAL', id, true FROM verification_document_types WHERE code IN ('SALE_DEED', 'APPROVED_BUILDING_PLAN', 'OCCUPANCY_CERTIFICATE');


-- ============================================================================
-- 2. VERIFICATION RESULTS
-- ============================================================================

-- Records the agent's verification of specific documents during a visit
CREATE TABLE property_document_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_id UUID NOT NULL REFERENCES property_verifications(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES verification_document_types(id),
    
    verified BOOLEAN DEFAULT FALSE,
    document_image_url TEXT,
    metadata JSONB,          -- e.g. {"registration_number": "1234/2019", "year": "2019"}
    notes TEXT,
    
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(verification_id, document_type_id)
);

-- (Optional) If we want checklist items to also be DB-driven later
CREATE TABLE verification_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE verification_checklist_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_id UUID NOT NULL REFERENCES property_verifications(id) ON DELETE CASCADE,
    checklist_item_id UUID NOT NULL REFERENCES verification_checklist_items(id),
    result BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(verification_id, checklist_item_id)
);

-- Seed Checklist Items
INSERT INTO verification_checklist_items (code, name, category) VALUES
('PROPERTY_EXISTS', 'Property exists at location', 'INSPECTION'),
('EXTERIOR_MATCHES', 'Exterior matches listing', 'INSPECTION'),
('INTERIOR_MATCHES', 'Interior matches listing', 'INSPECTION'),
('NO_LEGAL_NOTICES', 'No visible legal/dispute notices', 'INSPECTION'),
('SAFE_ENVIRONMENT', 'Safe and accessible environment', 'INSPECTION');


-- ============================================================================
-- 3. FRAUD INTELLIGENCE LAYER
-- ============================================================================

-- Signals raised by system, agent, or users
CREATE TABLE property_fraud_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    signal_type TEXT NOT NULL,  -- e.g., 'DUPLICATE_ADDRESS', 'GPS_MISMATCH'
    severity TEXT NOT NULL,     -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    description TEXT,
    detected_by TEXT NOT NULL,  -- 'SYSTEM', 'AGENT', 'USER', 'ADMIN'
    
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Automated Duplicate Detection Tracking
CREATE TABLE duplicate_property_detection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    matched_property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    similarity_score FLOAT NOT NULL, -- 0.0 to 1.0
    detection_method TEXT NOT NULL,  -- 'ADDRESS_MATCH', 'IMAGE_MATCH', 'GPS_MATCH'
    
    reviewed BOOLEAN DEFAULT FALSE,
    is_duplicate BOOLEAN,          -- True if admin confirms
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(property_id, matched_property_id)
);


-- ============================================================================
-- 4. TRUST & REPUTATION SCORING
-- ============================================================================

-- Aggregate trust metrics for search ranking
CREATE TABLE property_trust_scores (
    property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
    
    owner_verified BOOLEAN DEFAULT FALSE,
    documents_verified BOOLEAN DEFAULT FALSE,
    agent_verified BOOLEAN DEFAULT FALSE,
    
    fraud_signals_count INT DEFAULT 0,
    active_disputes_count INT DEFAULT 0,
    
    trust_score INT DEFAULT 0, -- 0 to 100 max
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent performance preventing fraudulent verification approvals
CREATE TABLE agent_verification_scores (
    agent_id UUID PRIMARY KEY REFERENCES agent_profiles(user_id) ON DELETE CASCADE,
    
    total_verifications INT DEFAULT 0,
    rejected_verifications INT DEFAULT 0,
    fraud_reports_against_approvals INT DEFAULT 0,
    
    trust_score INT DEFAULT 100, -- 0 to 100
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to initialize trust score when property is created
CREATE OR REPLACE FUNCTION init_property_trust_score()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO property_trust_scores (property_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_init_property_trust
    AFTER INSERT ON properties
    FOR EACH ROW
    EXECUTE FUNCTION init_property_trust_score();

-- Trigger to initialize agent score when agent profile is created
CREATE OR REPLACE FUNCTION init_agent_verification_score()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO agent_verification_scores (agent_id) VALUES (NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_init_agent_verif_score
    AFTER INSERT ON agent_profiles
    FOR EACH ROW
    EXECUTE FUNCTION init_agent_verification_score();

-- ============================================================================
-- 5. AUDIT LOGGING FOR VERIFICATION
-- ============================================================================

CREATE TABLE verification_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_id UUID NOT NULL REFERENCES property_verifications(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL, -- 'VERIFICATION_STARTED', 'GPS_VERIFIED', 'OTP_VERIFIED', 'DOCUMENT_LOGGED'
    event_data JSONB,
    
    performed_by UUID REFERENCES users(id),
    ip_address INET,
    
    created_at TIMESTAMP DEFAULT NOW()
);
