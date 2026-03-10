-- Migration: 031_visit_otp_verification.sql
-- Purpose: Add otp_verified_at to visit_verifications table
-- Date: 2026-02-24

ALTER TABLE visit_verifications 
ADD COLUMN otp_verified_at TIMESTAMP;

COMMENT ON COLUMN visit_verifications.otp_verified_at IS 'Timestamp when the buyer OTP was successfully verified by the agent';
