-- =====================================================
-- STEP 1: DROP ALL DUPLICATE FUNCTIONS
-- Run this FIRST before the main migration
-- =====================================================

-- This script drops all variations of functions that might exist

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all variations of set_user_offline
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'set_user_offline'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of update_user_heartbeat
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'update_user_heartbeat'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of increment_party_size
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'increment_party_size'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of decrement_party_size
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'decrement_party_size'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of update_currently_playing
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'update_currently_playing'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of clear_currently_playing
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'clear_currently_playing'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of add_tokens
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'add_tokens'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of update_playtime
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'update_playtime'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of update_quest_progress
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'update_quest_progress'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of kick_party_member
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'kick_party_member'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    -- Drop all variations of join_party_safe
    FOR r IN 
        SELECT 
            'DROP FUNCTION IF EXISTS ' || 
            ns.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'join_party_safe'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;

    RAISE NOTICE 'All duplicate functions dropped successfully!';
END $$;

