-- ============================================================================
-- Migration 042: Developer Profile Enhancements
-- NestFind — Builder / Developer Portal
-- ============================================================================
-- Adds missing contact and support fields for PropTech scalability.
-- ============================================================================

ALTER TABLE developer_profiles 
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS support_email TEXT,
    ADD COLUMN IF NOT EXISTS support_phone TEXT;

-- Seed existing data with the primary phone if support_phone is null
UPDATE developer_profiles 
SET support_phone = phone 
WHERE support_phone IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN developer_profiles.support_email IS 'Public facing support email for the developer company';
COMMENT ON COLUMN developer_profiles.website IS 'Official website of the developer / builder group';
