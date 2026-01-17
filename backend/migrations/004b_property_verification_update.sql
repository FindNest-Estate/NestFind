-- Migration: 004_property_verification_update.sql
-- Purpose: Add checklist and OTP fields to property_verifications
-- Date: 2026-01-05

ALTER TABLE property_verifications 
ADD COLUMN checklist JSONB,
ADD COLUMN otp_code TEXT,
ADD COLUMN otp_expires_at TIMESTAMP;
