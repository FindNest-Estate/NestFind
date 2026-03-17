-- Migration: 036_corporate_inventory_schema.sql
-- Purpose: Introduce Corporate Inventory model for iBuyer functionality (buying, renovating, reselling)
-- Date: 2026-03-16

CREATE TYPE corporate_inventory_status AS ENUM (
    'EVALUATING',
    'PURCHASED',
    'UNDER_RENOVATION',
    'LISTED_FOR_RESALE',
    'SOLD'
);

CREATE TYPE renovation_status AS ENUM (
    'ESTIMATED',
    'APPROVED',
    'IN_PROGRESS',
    'COMPLETED',
    'PAID'
);

CREATE TABLE corporate_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID UNIQUE NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    purchase_deal_id UUID REFERENCES deals(id),
    
    purchase_price DECIMAL(15,2) NOT NULL,
    estimated_renovation_budget DECIMAL(15,2),
    actual_renovation_cost DECIMAL(15,2) DEFAULT 0,
    target_resale_price DECIMAL(15,2),
    actual_resale_price DECIMAL(15,2),
    
    status corporate_inventory_status NOT NULL DEFAULT 'EVALUATING',
    
    purchased_at TIMESTAMP WITH TIME ZONE,
    listed_at TIMESTAMP WITH TIME ZONE,
    sold_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE renovation_ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES corporate_inventory(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES users(id), -- Assuming contractors can have a user profile or just be an entity
    
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    
    status renovation_status NOT NULL DEFAULT 'ESTIMATED',
    
    estimated_start TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    actual_completion TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_corp_inventory_updated_at
    BEFORE UPDATE ON corporate_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER trg_renovation_ledger_updated_at
    BEFORE UPDATE ON renovation_ledgers
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();
