-- NestFind Database Setup Script
-- Run this to create the database and apply all migrations

-- ============================================================================
-- STEP 1: Create database (run with: psql -U postgres -f setup_db.sql)
-- ============================================================================

\c postgres
DROP DATABASE IF EXISTS nestfind_auth;
CREATE DATABASE nestfind_auth;

-- Create application user (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nestfind_user') THEN
        CREATE ROLE nestfind_user WITH LOGIN PASSWORD 'your_secure_password_here';
    END IF;
END
$$;

\c nestfind_auth

-- ============================================================================
-- STEP 2: Apply all migrations
-- ============================================================================

-- Run migrations in order:
-- psql -U postgres -d nestfind_auth -f migrations/001_auth_schema.sql
-- psql -U postgres -d nestfind_auth -f migrations/002_registration_fields.sql
-- psql -U postgres -d nestfind_auth -f migrations/003_property_schema.sql
-- psql -U postgres -d nestfind_auth -f migrations/004_add_state_pincode.sql
-- psql -U postgres -d nestfind_auth -f migrations/004b_property_verification_update.sql
-- psql -U postgres -d nestfind_auth -f migrations/005_messaging_notifications.sql
-- psql -U postgres -d nestfind_auth -f migrations/005b_saved_properties.sql
-- psql -U postgres -d nestfind_auth -f migrations/006_visit_offer_schema.sql
-- psql -U postgres -d nestfind_auth -f migrations/007_reservation_schema.sql
-- psql -U postgres -d nestfind_auth -f migrations/008_transaction_schema.sql
-- psql -U postgres -d nestfind_auth -f migrations/009_dispute_audit_schema.sql
-- psql -U postgres -d nestfind_auth -f migrations/010_fix_agent_schema.sql
-- psql -U postgres -d nestfind_auth -f migrations/011_property_stats_schema.sql

-- OR run all at once with PowerShell:
-- Get-ChildItem "migrations/*.sql" | Sort-Object Name | ForEach-Object { psql -U postgres -d nestfind_auth -f $_.FullName }

-- ============================================================================
-- STEP 3: Grant privileges
-- ============================================================================

GRANT ALL PRIVILEGES ON DATABASE nestfind_auth TO nestfind_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nestfind_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nestfind_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nestfind_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nestfind_user;

-- ============================================================================
-- CONFIGURATION NOTES
-- ============================================================================
-- 
-- Backend expects these environment variables in .env:
--   DB_HOST=localhost
--   DB_PORT=5432
--   DB_USER=nestfind_user
--   DB_PASSWORD=your_secure_password_here
--   DB_NAME=nestfind_auth
--
-- Default values in database.py:
--   database=nestfind_auth
--   user=nestfind_user
