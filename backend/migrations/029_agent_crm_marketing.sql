-- 029_agent_crm_marketing.sql
-- Create Explicit CRM Leads and Marketing Profiles tables

-- 1. Create robust timestamp update function (if it doesn't already exist from another migration)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 2. Explicit CRM Leads Table
CREATE TABLE IF NOT EXISTS agent_crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE SET NULL, -- nullable for manual entry
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    type VARCHAR(20) NOT NULL CHECK (type IN ('BUYER', 'SELLER', 'OTHER')),
    pipeline_stage VARCHAR(30) NOT NULL DEFAULT 'NEW' CHECK (pipeline_stage IN ('NEW', 'CONTACTED', 'SHOWING', 'OFFER', 'CLOSED', 'LOST')),
    temperature VARCHAR(20) NOT NULL DEFAULT 'WARM' CHECK (temperature IN ('COLD', 'WARM', 'HOT')),
    notes TEXT,
    expected_value NUMERIC(15, 2),
    last_contacted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEX for fast agent lookups
CREATE INDEX IF NOT EXISTS idx_agent_crm_leads_agent_id ON agent_crm_leads(agent_id);

-- Add update trigger for agent_crm_leads
CREATE TRIGGER update_agent_crm_leads_updated_at
    BEFORE UPDATE ON agent_crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Agent Marketing Profiles Table
CREATE TABLE IF NOT EXISTS agent_marketing_profiles (
    agent_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    service_areas TEXT[] DEFAULT '{}',
    photo_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add update trigger for agent_marketing_profiles
CREATE TRIGGER update_agent_marketing_profiles_updated_at
    BEFORE UPDATE ON agent_marketing_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
