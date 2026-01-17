-- Migration 013: Grant Permissions on Agent Features Tables
-- Fixes permission denied error for nestfind_user on newly created tables

GRANT ALL PRIVILEGES ON TABLE agent_schedule_events TO nestfind_user;
GRANT ALL PRIVILEGES ON TABLE marketing_history TO nestfind_user;

-- Also grant usage on sequences if they are implicit (SERIAL/BIGSERIAL) or explicitly associated
-- agent_schedule_events_id_seq? The IDs are UUIDs (gen_random_uuid()), so no sequences might be needed for IDs.
-- But just in case any sequences were created.
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nestfind_user;
