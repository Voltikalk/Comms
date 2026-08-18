-- ============================================================================
-- 004_add_fulltext_search.sql
-- Description: Full-Text Search (FTS) configuration with Russian + English stemming,
--              tsvector search_vector column, GIN indexes, and search_messages RPC
-- ============================================================================

-- 1. Enable required PostgreSQL extensions for full-text and fuzzy search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 2. Add search_vector column to messages table if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 3. Function to generate multilingual search vector (Russian + English)
CREATE OR REPLACE FUNCTION generate_message_search_vector(msg_content TEXT)
RETURNS tsvector AS $$
BEGIN
    RETURN (
        setweight(to_tsvector('russian', COALESCE(msg_content, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(msg_content, '')), 'B')
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Trigger function to automatically update search_vector
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := generate_message_search_vector(NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create before insert/update trigger on messages
DROP TRIGGER IF EXISTS message_search_vector_trigger ON messages;
CREATE TRIGGER message_search_vector_trigger
BEFORE INSERT OR UPDATE OF content ON messages
FOR EACH ROW
EXECUTE FUNCTION update_message_search_vector();

-- 6. Backfill existing messages
UPDATE messages
SET search_vector = generate_message_search_vector(content)
WHERE search_vector IS NULL AND content IS NOT NULL;

-- 7. High-performance GIN Indexes for Full-Text and Trigram Search
CREATE INDEX IF NOT EXISTS message_search_idx ON messages USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS message_content_trigram_idx ON messages USING GIN(content gin_trgm_ops);

-- 8. Stored Procedure for Ranked Search with Highlighting and Room Filter
CREATE OR REPLACE FUNCTION search_messages(
    query_text TEXT,
    target_room_id UUID DEFAULT NULL,
    max_limit INT DEFAULT 50,
    min_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    room_id UUID,
    sender_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE,
    rank REAL,
    headline TEXT
) AS $$
DECLARE
    parsed_query tsquery;
BEGIN
    -- Build combined query for Russian and English
    parsed_query := plainto_tsquery('russian', query_text) || plainto_tsquery('english', query_text);

    RETURN QUERY
    SELECT 
        m.id,
        m.room_id,
        m.sender_id,
        m.content,
        m.created_at,
        m.edited_at,
        ts_rank(m.search_vector, parsed_query) AS rank,
        ts_headline('russian', m.content, parsed_query, 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15') AS headline
    FROM messages m
    WHERE m.deleted_at IS NULL
      AND (target_room_id IS NULL OR m.room_id = target_room_id)
      AND (m.search_vector @@ parsed_query OR m.content ILIKE '%' || query_text || '%')
    ORDER BY rank DESC, m.created_at DESC
    LIMIT max_limit
    OFFSET min_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_messages IS 'Выполняет ранжированный полнотекстовый поиск сообщений с поддержкой русского и английского языков и подсветкой совпадений.';
