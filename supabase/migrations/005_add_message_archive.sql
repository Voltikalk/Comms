-- ============================================================================
-- 005_add_message_archive.sql
-- Description: Message Archiving System: messages_archive table, indexes,
--              and atomic stored procedures (archive, restore, stats)
-- ============================================================================

-- 1. Create messages_archive table
CREATE TABLE IF NOT EXISTS messages_archive (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    reply_to_id UUID,
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Indexes for fast search and range retrieval in archive
CREATE INDEX IF NOT EXISTS idx_messages_archive_room_created 
ON messages_archive (room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_archive_sender 
ON messages_archive (sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_archive_archived_at 
ON messages_archive (archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_archive_search 
ON messages_archive USING GIN(search_vector);

-- 3. Stored Procedure to Archive Old Messages Atomically
CREATE OR REPLACE FUNCTION archive_old_messages(
    days_to_keep INT DEFAULT 365,
    target_room_id UUID DEFAULT NULL
)
RETURNS TABLE (
    archived_count INT,
    cutoff_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    cutoff TIMESTAMP WITH TIME ZONE;
    moved_count INT;
BEGIN
    cutoff := NOW() - (days_to_keep || ' days')::INTERVAL;

    -- Copy to archive
    WITH moved_rows AS (
        DELETE FROM messages
        WHERE created_at < cutoff
          AND (target_room_id IS NULL OR room_id = target_room_id)
        RETURNING id, room_id, sender_id, content, reply_to_id, search_vector, created_at, edited_at, deleted_at
    )
    INSERT INTO messages_archive (id, room_id, sender_id, content, reply_to_id, search_vector, created_at, edited_at, deleted_at, archived_at)
    SELECT id, room_id, sender_id, content, reply_to_id, search_vector, created_at, edited_at, deleted_at, NOW()
    FROM moved_rows;

    GET DIAGNOSTICS moved_count = ROW_COUNT;

    RETURN QUERY SELECT moved_count, cutoff;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Stored Procedure to Restore an Archived Message
CREATE OR REPLACE FUNCTION restore_archived_message(target_msg_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    restored_row RECORD;
BEGIN
    DELETE FROM messages_archive
    WHERE id = target_msg_id
    RETURNING id, room_id, sender_id, content, reply_to_id, search_vector, created_at, edited_at, deleted_at
    INTO restored_row;

    IF restored_row.id IS NULL THEN
        RETURN FALSE;
    END IF;

    INSERT INTO messages (id, room_id, sender_id, content, reply_to_id, search_vector, created_at, edited_at, deleted_at)
    VALUES (
        restored_row.id,
        restored_row.room_id,
        restored_row.sender_id,
        restored_row.content,
        restored_row.reply_to_id,
        restored_row.search_vector,
        restored_row.created_at,
        restored_row.edited_at,
        restored_row.deleted_at
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Stored Procedure to Get Archive Statistics
CREATE OR REPLACE FUNCTION get_archive_stats(target_room_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_archived BIGINT,
    oldest_message TIMESTAMP WITH TIME ZONE,
    newest_message TIMESTAMP WITH TIME ZONE,
    estimated_size_kb BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_archived,
        MIN(created_at) AS oldest_message,
        MAX(created_at) AS newest_message,
        (COUNT(*) * 0.45)::BIGINT AS estimated_size_kb
    FROM messages_archive
    WHERE (target_room_id IS NULL OR room_id = target_room_id);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE messages_archive IS 'Архивное долговременное хранилище старых сообщений мессенджера.';
