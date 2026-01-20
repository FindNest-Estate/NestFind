-- Fix permissions for nestfind_user
GRANT ALL PRIVILEGES ON SCHEMA public TO nestfind_user;
GRANT ALL PRIVILEGES ON TABLE collections TO nestfind_user;
GRANT ALL PRIVILEGES ON TABLE collection_items TO nestfind_user;
GRANT ALL PRIVILEGES ON TABLE visit_feedback_buyer TO nestfind_user;
GRANT ALL PRIVILEGES ON TABLE visit_feedback_agent TO nestfind_user;

-- Ensure future tables match
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nestfind_user;
