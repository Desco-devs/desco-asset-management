-- Supabase Phase 1 Chat Update Script
-- Run this to align with our simplified Phase 1 implementation

-- ==============================================
-- UPDATE HELPER FUNCTIONS FOR PHASE 1 SCHEMA
-- ==============================================

-- Updated function to get room details (Phase 1 compatible)
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
            SELECT json_build_object(
                'id', m.id,
                'content', m.content,
                'created_at', m.created_at,
                'sender', json_build_object(
                    'id', u.id,
                    'username', u.username,
                    'full_name', u.full_name
                )
            )
            FROM messages m 
            JOIN users u ON m.sender_id = u.id
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

-- Simplified mark messages read function (Phase 1 compatible)
-- Since Phase 1 doesn't have last_read, we'll just ensure the user is a member
CREATE OR REPLACE FUNCTION mark_messages_read(room_id_param UUID, user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Just ensure the user is a member of the room
    INSERT INTO room_members (room_id, user_id, joined_at)
    VALUES (room_id_param, user_id_param, NOW())
    ON CONFLICT (room_id, user_id) DO NOTHING;
END;
$$;

-- ==============================================
-- VERIFICATION FOR PHASE 1
-- ==============================================

-- Verify our Phase 1 tables exist with correct structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('rooms', 'messages', 'room_members')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ==============================================
-- PHASE 1 SETUP COMPLETE!
-- ==============================================