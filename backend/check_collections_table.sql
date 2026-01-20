-- Check if collections table exists and in which schema
SELECT 
    schemaname, 
    tablename, 
    tableowner
FROM pg_tables 
WHERE tablename = 'collections';

-- Check current user
SELECT current_user, current_database();

-- Check all tables in public schema
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check table with information_schema (what Python uses)
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = 'collections';
