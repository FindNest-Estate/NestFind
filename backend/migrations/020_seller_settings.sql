-- Migration: 020_seller_settings.sql
-- Purpose: Create table for seller preferences
-- Date: 2026-01-20

CREATE TABLE IF NOT EXISTS seller_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification Preferences
    email_offers BOOLEAN DEFAULT TRUE,
    email_visits BOOLEAN DEFAULT TRUE,
    email_messages BOOLEAN DEFAULT TRUE,
    email_marketing BOOLEAN DEFAULT FALSE,
    push_offers BOOLEAN DEFAULT TRUE,
    push_visits BOOLEAN DEFAULT TRUE,
    push_messages BOOLEAN DEFAULT TRUE,
    
    -- Privacy & Profile
    contact_phone_visible BOOLEAN DEFAULT FALSE,
    auto_respond_inquiries BOOLEAN DEFAULT FALSE,
    
    -- Display Preferences
    default_currency VARCHAR(10) DEFAULT 'INR',
    default_view VARCHAR(10) DEFAULT 'grid',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_seller_settings_user ON seller_settings(user_id);
