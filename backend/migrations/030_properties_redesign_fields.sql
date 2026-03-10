-- Migration 030: Add fields for property redesign

-- Add listing_type to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_type VARCHAR(50) DEFAULT 'SALE';

-- Add profile image to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add brokerage name to agent_profiles
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS brokerage_name VARCHAR(255);
