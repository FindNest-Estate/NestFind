-- Migration: 026_hybrid_roles.sql
-- Description: Enable Hybrid Roles (Buyer/Seller), update schema, and migrate legacy USER role to BUYER.

-- ============================================================
-- STEP 1: Add enum values and COMMIT (must be in own transaction)
-- New enum values cannot be used in the same transaction they are created.
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'BUYER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SELLER';

-- ============================================================
-- STEP 2: Remaining changes (separate transaction)
-- ============================================================

BEGIN;

-- Ensure roles exist in the roles table
INSERT INTO roles (name) VALUES ('BUYER'), ('SELLER') ON CONFLICT (name) DO NOTHING;

-- Add status and metadata to user_roles table
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Data Migration: Convert existing 'USER' assignments to 'BUYER'
DO $$
DECLARE
    buyer_role_id UUID;
    user_role_id UUID;
BEGIN
    SELECT id INTO buyer_role_id FROM roles WHERE name = 'BUYER';
    SELECT id INTO user_role_id FROM roles WHERE name = 'USER';

    IF user_role_id IS NOT NULL AND buyer_role_id IS NOT NULL THEN
        UPDATE user_roles 
        SET role_id = buyer_role_id 
        WHERE role_id = user_role_id;
    END IF;
END $$;

COMMIT;
