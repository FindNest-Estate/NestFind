-- Fix missing columns in agent_profiles
-- Add columns expected by public_agents_service and admin_services

ALTER TABLE agent_profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_cases INT NOT NULL DEFAULT 0;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_agent_profiles_rating ON agent_profiles(rating);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_status ON agent_profiles(is_active, kyc_status);
UPDATE agent_profiles SET kyc_status = 'VERIFIED', is_active = true, rating = 5.0 FROM users u WHERE agent_profiles.user_id = u.id AND u.status = 'ACTIVE';
