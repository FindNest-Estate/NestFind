-- Migration: 034_timestamp_modernization.sql
-- Purpose: Convert standard timestamps to timestamptz for correct global timezone handling
-- Date: 2026-03-16

-- ============================================================================
-- NOTE: In PostgreSQL, altering a column type from TIMESTAMP to TIMESTAMPTZ 
-- assumes the existing times are in the server's time zone (usually UTC).
-- This is exactly what we want.
-- ============================================================================

-- Core tables
ALTER TABLE users 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN login_locked_until TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN email_verified_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE properties 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE deals 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN cancelled_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN expired_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE transactions 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN registration_date TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN buyer_otp_expires_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN buyer_otp_verified_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN seller_otp_expires_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN seller_otp_verified_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN agent_gps_verified_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN completed_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN slot_booked_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN buyer_signed_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN seller_signed_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN agent_signed_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN seller_paid_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN agent_disbursed_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN admin_approved_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE reservations 
    ALTER COLUMN start_date TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN end_date TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN cancelled_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN admin_verified_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN proof_uploaded_at TYPE TIMESTAMP WITH TIME ZONE;

-- Offers and Messages
ALTER TABLE offers 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN responded_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE messages 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
    ALTER COLUMN read_at TYPE TIMESTAMP WITH TIME ZONE;

-- Logging and Audit (Huge tables, might take a moment)
ALTER TABLE audit_logs 
    ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE admin_actions 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;

ALTER TABLE deal_events 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
