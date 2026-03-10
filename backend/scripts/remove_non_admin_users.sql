-- SQL Script to remove non-admin users and their related data
-- This script preserves ADMIN users.

DO $$
DECLARE
    row_count_users INTEGER;
BEGIN
    -- 1. DELETE FROM OPERATIONAL DATA (Dependencies First)
    DELETE FROM ledger_entries;
    DELETE FROM financial_ledgers;
    DELETE FROM dispute_evidence;
    DELETE FROM disputes;
    DELETE FROM agreements;
    DELETE FROM deals;
    
    DELETE FROM offers;
    DELETE FROM visit_images;
    DELETE FROM visit_feedback_agent;
    DELETE FROM visit_feedback_buyer;
    DELETE FROM visit_verifications;
    DELETE FROM visit_otp;
    DELETE FROM visit_requests;
    
    DELETE FROM transactions;
    DELETE FROM transaction_documents;
    DELETE FROM reservations;
    DELETE FROM payment_logs;
    
    DELETE FROM property_media;
    DELETE FROM property_highlights;
    DELETE FROM property_price_history;
    DELETE FROM property_verifications;
    DELETE FROM property_views;
    DELETE FROM saved_properties;
    DELETE FROM collection_items;
    DELETE FROM collections;
    DELETE FROM properties;
    
    DELETE FROM notification_intents;
    DELETE FROM notifications;
    DELETE FROM audit_logs;
    DELETE FROM messages;
    DELETE FROM conversations;
    
    DELETE FROM agent_schedule_events;
    DELETE FROM agent_assignments;
    DELETE FROM agent_profiles;
    DELETE FROM seller_settings;
    
    DELETE FROM sessions;
    DELETE FROM email_otp_verifications;

    -- 2. DELETE NON-ADMIN USERS
    -- First, delete roles for users that aren't ADMINs
    DELETE FROM user_roles 
    WHERE user_id IN (
        SELECT u.id 
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE r.name != 'ADMIN' OR r.name IS NULL
    );

    -- Now delete the users themselves
    DELETE FROM users 
    WHERE id NOT IN (
        SELECT ur.user_id 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'ADMIN'
    );

    GET DIAGNOSTICS row_count_users = ROW_COUNT;
    RAISE NOTICE 'Deleted % non-admin users and cleared all operational data.', row_count_users;
END $$;
