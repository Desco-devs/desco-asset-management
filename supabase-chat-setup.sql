-- Supabase Chat Setup Script
-- Run this entire script in your Supabase SQL Editor

-- ==============================================
-- STEP 1: Enable Realtime for Chat Tables
-- This is the MOST IMPORTANT step for chat functionality
-- ==============================================

-- Add chat tables to realtime publication (enables live updates)
-- Using DO blocks to skip if already exists
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table rooms already in realtime publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table messages already in realtime publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table room_members already in realtime publication';
    END;
END $$;

-- ==============================================
-- STEP 2: Create Performance Indexes
-- These optimize chat queries for better performance
-- ==============================================

-- Message performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at DESC);

-- Room member indexes
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);

-- ==============================================
-- STEP 3: Helper Functions (Optional but Recommended)
-- These provide optimized queries for common chat operations
-- ==============================================

-- Function to get room with member count and last message
CREATE OR REPLACE FUNCTION get_room_details(room_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'room', row_to_json(r),
        'member_count', (SELECT COUNT(*) FROM room_members WHERE room_id = room_id_param),
        'last_message', (
            SELECT row_to_json(m) 
            FROM messages m 
            WHERE m.room_id = room_id_param 
            ORDER BY m.created_at DESC 
            LIMIT 1
        )
    )
    INTO result
    FROM rooms r
    WHERE r.id = room_id_param;
    
    RETURN result;
END;
$$;

-- Function to mark messages as read for a user in a room
-- Note: Current schema doesn't have last_read field, so this updates joined_at as a workaround
CREATE OR REPLACE FUNCTION mark_messages_read(room_id_param UUID, user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update the room member's joined_at timestamp to mark as "read"
    -- In a future schema update, you might want to add a last_read_at field
    UPDATE room_members 
    SET joined_at = GREATEST(joined_at, NOW())
    WHERE room_id = room_id_param AND user_id = user_id_param;
    
    -- If the member doesn't exist, insert them
    INSERT INTO room_members (room_id, user_id, joined_at)
    VALUES (room_id_param, user_id_param, NOW())
    ON CONFLICT (room_id, user_id) DO NOTHING;
END;
$$;

-- ==============================================
-- STEP 4: Verification Queries
-- Run these to verify everything is set up correctly
-- ==============================================

-- Check if tables are added to realtime publication
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('rooms', 'messages', 'room_members');

-- Check if indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('messages', 'room_members', 'rooms')
AND indexname LIKE 'idx_%';

-- Check if functions were created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_room_details', 'mark_messages_read');

-- ==============================================
-- SETUP COMPLETE!
-- ==============================================
-- After running this script:
-- 1. Your chat tables will have realtime enabled
-- 2. Performance indexes will be optimized
-- 3. Helper functions will be available
-- 4. Start your Next.js app: npm run dev
-- 5. Navigate to /chat-app to test messaging
-- ==============================================