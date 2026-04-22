-- ============================================================================
-- Migration 041: Developer Portal Schema
-- NestFind — Builder / Developer Portal
-- ============================================================================
-- Creates all tables for:
--   Projects, Units, Offers, Deals, Leads, Agents, Documents, Audit Logs
-- Enums use dev_ prefix to avoid collisions with existing types.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

CREATE TYPE dev_project_type AS ENUM (
    'APARTMENT',
    'PLOT_VENTURE',
    'VILLA_PROJECT',
    'GATED_COMMUNITY',
    'COMMERCIAL'
);

CREATE TYPE dev_project_status AS ENUM (
    'UPCOMING',
    'UNDER_CONSTRUCTION',
    'READY_TO_MOVE',
    'SOLD_OUT'
);

CREATE TYPE dev_account_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);

CREATE TYPE dev_unit_status AS ENUM (
    'AVAILABLE',
    'NEGOTIATION',
    'RESERVED',
    'BOOKED',
    'SOLD',
    'BLOCKED'
);

CREATE TYPE dev_offer_status AS ENUM (
    'PENDING',
    'UNDER_REVIEW',
    'COUNTERED',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED'
);

CREATE TYPE dev_deal_stage AS ENUM (
    'DEAL_STARTED',
    'VISIT_SCHEDULED',
    'OFFER_SUBMITTED',
    'IN_NEGOTIATION',
    'PRICE_AGREED',
    'AWAITING_TOKEN',
    'TOKEN_PAID',
    'AGREEMENT_SIGNED',
    'AT_REGISTRATION',
    'COMPLETED',
    'COMMISSION_RELEASED',
    'CANCELLED'
);

CREATE TYPE dev_lead_status AS ENUM (
    'NEW',
    'CONTACTED',
    'VISIT_SCHEDULED',
    'NEGOTIATION',
    'CLOSED'
);

CREATE TYPE dev_document_type AS ENUM (
    'RERA_CERTIFICATE',
    'DTCP_APPROVAL',
    'BUILDING_PLAN',
    'LEGAL_DOCUMENT',
    'BROCHURE',
    'OTHER'
);

-- Add DEVELOPER and BUYER roles to existing user_role enum if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'DEVELOPER'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'DEVELOPER';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'BUYER'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'BUYER';
    END IF;
END
$$;

-- Ensure DEVELOPER role exists in roles table
INSERT INTO roles (name) VALUES ('DEVELOPER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('BUYER') ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- DEVELOPER PROFILES
-- Extends users table for Developer-specific registration data
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS developer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Company Information
    company_name TEXT NOT NULL,
    developer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    office_address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,

    -- Regulatory
    rera_registration_number TEXT,
    company_registration_number TEXT,
    gst_number TEXT,

    -- Experience
    projects_handled_before INT DEFAULT 0,
    years_of_experience INT DEFAULT 0,
    about_company TEXT,

    -- Status & Verification
    status dev_account_status NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,

    -- Settings (JSONB for flexibility)
    settings JSONB DEFAULT '{
        "token_deadline_hours": 48,
        "min_offer_percentage": 90,
        "auto_reject_low_offers": false,
        "allow_multiple_negotiations": true,
        "default_agent_commission_pct": 2.0,
        "allow_external_agents": true,
        "notify_new_lead": true,
        "notify_new_offer": true,
        "notify_offer_accepted": true,
        "notify_token_deadline": true,
        "notify_deal_stage_change": true,
        "email_notifications": true,
        "sms_notifications": false
    }'::jsonb,

    -- Logo
    logo_url TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_profiles_user_id ON developer_profiles(user_id);
CREATE INDEX idx_dev_profiles_status ON developer_profiles(status);
CREATE INDEX idx_dev_profiles_rera ON developer_profiles(rera_registration_number);

-- ----------------------------------------------------------------------------
-- DEV_PROJECTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Core Info
    project_name TEXT NOT NULL,
    project_type dev_project_type NOT NULL,
    status dev_project_status NOT NULL DEFAULT 'UPCOMING',

    -- Location
    location TEXT NOT NULL,
    city TEXT,
    state TEXT,
    pincode TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Scale
    total_land_area DECIMAL(12, 2),   -- in sq ft or acres
    total_units INT NOT NULL DEFAULT 0,

    -- Dates
    launch_date DATE,
    possession_date DATE,

    -- Regulatory
    rera_number TEXT,

    -- Content
    description TEXT,
    amenities JSONB DEFAULT '[]'::jsonb,
    project_images JSONB DEFAULT '[]'::jsonb,  -- array of image URLs
    brochure_pdf TEXT,
    master_layout TEXT,

    -- Soft delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_projects_developer_id ON dev_projects(developer_id);
CREATE INDEX idx_dev_projects_status ON dev_projects(status);
CREATE INDEX idx_dev_projects_type ON dev_projects(project_type);
CREATE INDEX idx_dev_projects_location ON dev_projects(city, state);
CREATE INDEX idx_dev_projects_active ON dev_projects(developer_id) WHERE is_deleted = FALSE;

-- ----------------------------------------------------------------------------
-- DEV_UNITS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,

    -- Identification
    unit_number TEXT NOT NULL,
    unit_type TEXT NOT NULL,        -- Flat / Plot / Villa / Shop / etc.

    -- Dimensions
    area_sqft DECIMAL(10, 2),

    -- Pricing
    price DECIMAL(15, 2) NOT NULL,

    -- Physical attributes
    facing TEXT,                    -- North / South / East / West / NE etc.
    floor INT,                      -- NULL for plots
    bedrooms INT,
    bathrooms INT,
    parking INT DEFAULT 0,

    -- Status
    status dev_unit_status NOT NULL DEFAULT 'AVAILABLE',

    -- Soft delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(project_id, unit_number)
);

CREATE INDEX idx_dev_units_project_id ON dev_units(project_id);
CREATE INDEX idx_dev_units_status ON dev_units(status);
CREATE INDEX idx_dev_units_type ON dev_units(unit_type);
CREATE INDEX idx_dev_units_price ON dev_units(price);
CREATE INDEX idx_dev_units_available ON dev_units(project_id, status) WHERE is_deleted = FALSE;

-- ----------------------------------------------------------------------------
-- DEV_OFFERS
-- Multiple buyers can submit offers for the same unit simultaneously
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES dev_units(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Pricing
    offer_price DECIMAL(15, 2) NOT NULL,
    counter_price DECIMAL(15, 2),

    -- Status
    status dev_offer_status NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,

    -- Messages
    buyer_message TEXT,
    seller_message TEXT,

    -- Expiry
    expires_at TIMESTAMP,

    -- Metadata
    ip_address TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_offers_unit_id ON dev_offers(unit_id);
CREATE INDEX idx_dev_offers_buyer_id ON dev_offers(buyer_id);
CREATE INDEX idx_dev_offers_status ON dev_offers(status);
CREATE INDEX idx_dev_offers_unit_active ON dev_offers(unit_id, status) WHERE status IN ('PENDING', 'UNDER_REVIEW', 'COUNTERED');

-- ----------------------------------------------------------------------------
-- DEV_OFFER_HISTORY
-- Immutable negotiation timeline — one row per action
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_offer_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES dev_offers(id) ON DELETE CASCADE,

    action TEXT NOT NULL,               -- SUBMITTED / COUNTERED / ACCEPTED / REJECTED / EXPIRED
    actor_id UUID REFERENCES users(id),
    actor_role TEXT NOT NULL,           -- BUYER / DEVELOPER / SYSTEM

    amount DECIMAL(15, 2),              -- Price at time of action
    message TEXT,
    details JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_offer_history_offer_id ON dev_offer_history(offer_id);
CREATE INDEX idx_dev_offer_history_created ON dev_offer_history(created_at);

-- ----------------------------------------------------------------------------
-- DEV_DEALS
-- One deal per accepted offer; tracks full pipeline
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES dev_offers(id),
    unit_id UUID NOT NULL REFERENCES dev_units(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    developer_id UUID NOT NULL REFERENCES users(id),
    agent_id UUID REFERENCES users(id),

    -- Financials
    final_price DECIMAL(15, 2) NOT NULL,
    token_amount DECIMAL(15, 2),
    commission_amount DECIMAL(15, 2),
    commission_released BOOLEAN NOT NULL DEFAULT FALSE,

    -- Pipeline Stage
    deal_stage dev_deal_stage NOT NULL DEFAULT 'DEAL_STARTED',

    -- Dates
    agreement_date DATE,
    registration_date DATE,
    token_deadline TIMESTAMP,          -- 48hr from PRICE_AGREED stage

    -- Notes
    notes TEXT,

    -- Soft cancel
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Prevent double deals on same unit (max 1 active deal)
    CONSTRAINT one_active_deal_per_unit UNIQUE (unit_id)
);

CREATE INDEX idx_dev_deals_developer_id ON dev_deals(developer_id);
CREATE INDEX idx_dev_deals_buyer_id ON dev_deals(buyer_id);
CREATE INDEX idx_dev_deals_unit_id ON dev_deals(unit_id);
CREATE INDEX idx_dev_deals_stage ON dev_deals(deal_stage);
CREATE INDEX idx_dev_deals_agent_id ON dev_deals(agent_id);
CREATE INDEX idx_dev_deals_token_deadline ON dev_deals(token_deadline) WHERE deal_stage = 'AWAITING_TOKEN';

-- Deal stage history
CREATE TABLE IF NOT EXISTS dev_deal_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES dev_deals(id) ON DELETE CASCADE,

    from_stage dev_deal_stage,
    to_stage dev_deal_stage NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_role TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_deal_history_deal_id ON dev_deal_history(deal_id);

-- ----------------------------------------------------------------------------
-- DEV_LEADS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    developer_id UUID NOT NULL REFERENCES users(id),
    buyer_id UUID REFERENCES users(id),
    project_id UUID REFERENCES dev_projects(id),
    unit_id UUID REFERENCES dev_units(id),

    -- Contact (for anonymous leads)
    name TEXT,
    phone TEXT,
    email TEXT,
    source TEXT DEFAULT 'INTEREST_CLICK',  -- INTEREST_CLICK / VISIT_REQUEST / OFFER

    -- Status
    lead_status dev_lead_status NOT NULL DEFAULT 'NEW',

    -- Visit
    visit_date TIMESTAMP,
    visit_notes TEXT,

    -- Assignment
    assigned_agent_id UUID REFERENCES users(id),

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_leads_developer_id ON dev_leads(developer_id);
CREATE INDEX idx_dev_leads_buyer_id ON dev_leads(buyer_id);
CREATE INDEX idx_dev_leads_project_id ON dev_leads(project_id);
CREATE INDEX idx_dev_leads_status ON dev_leads(lead_status);

-- ----------------------------------------------------------------------------
-- DEV_AGENTS (Developer-assigned agents)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_user_id UUID REFERENCES users(id),  -- NULL if external agent

    -- Agent Info
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 2.0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_external BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_agents_developer_id ON dev_agents(developer_id);
CREATE INDEX idx_dev_agents_agent_user_id ON dev_agents(agent_user_id);

-- ----------------------------------------------------------------------------
-- DEV_DOCUMENTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES dev_projects(id) ON DELETE CASCADE,

    doc_type dev_document_type NOT NULL,
    doc_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,

    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_documents_developer_id ON dev_documents(developer_id);
CREATE INDEX idx_dev_documents_project_id ON dev_documents(project_id);
CREATE INDEX idx_dev_documents_type ON dev_documents(doc_type);

-- ----------------------------------------------------------------------------
-- DEV_AUDIT_LOGS
-- Immutable audit trail for all Developer Portal actions
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dev_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    developer_id UUID REFERENCES users(id),
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    ip_address TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_audit_developer_id ON dev_audit_logs(developer_id);
CREATE INDEX idx_dev_audit_entity ON dev_audit_logs(entity_type, entity_id);
CREATE INDEX idx_dev_audit_action ON dev_audit_logs(action);
CREATE INDEX idx_dev_audit_created ON dev_audit_logs(created_at);

-- ----------------------------------------------------------------------------
-- GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nestfind_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nestfind_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nestfind_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nestfind_user;
