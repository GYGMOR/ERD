-- Migration: Unify Ticket Comments to Ticket Messages
-- Rename table and columns to match database_schema.sql

DO $$
BEGIN
    -- Rename table if it exists as ticket_comments
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'ticket_comments') THEN
        ALTER TABLE ticket_comments RENAME TO ticket_messages;
    END IF;

    -- Rename columns if they exist with old names
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ticket_messages' AND column_name = 'user_id') THEN
        ALTER TABLE ticket_messages RENAME COLUMN user_id TO sender_id;
    END IF;

    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ticket_messages' AND column_name = 'body') THEN
        ALTER TABLE ticket_messages RENAME COLUMN body TO message;
    END IF;
END $$;
