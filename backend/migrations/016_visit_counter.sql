-- Migration: Add counter-offer support to visit requests

-- Add COUNTERED to visit_status enum if it doesn't exist
ALTER TYPE visit_status ADD VALUE IF NOT EXISTS 'COUNTERED';

-- Add negotiation columns to visit_requests table
ALTER TABLE visit_requests
ADD COLUMN IF NOT EXISTS counter_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS counter_message TEXT,
ADD COLUMN IF NOT EXISTS counter_by UUID REFERENCES users(id); -- User who made the counter offer

-- Create index for faster queries on counter status
CREATE INDEX IF NOT EXISTS idx_visit_requests_counter_by ON visit_requests(counter_by);
