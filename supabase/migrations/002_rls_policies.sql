-- ============================================================================
-- 002_rls_policies.sql
-- Description: Row Level Security (RLS) policies and security functions
-- ============================================================================

-- 1. Helper function to check if current user is an active member of a room
CREATE OR REPLACE FUNCTION is_room_member(check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM room_members 
        WHERE room_id = check_room_id 
          AND user_id = auth.uid()
          AND left_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to check if current user is an admin of a room
CREATE OR REPLACE FUNCTION is_room_admin(check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM room_members 
        WHERE room_id = check_room_id 
          AND user_id = auth.uid()
          AND role = 'admin'
          AND left_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- USERS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
CREATE POLICY "Public profiles are viewable by everyone"
ON users FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (id = auth.uid() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can insert their profile on registration" ON users;
CREATE POLICY "Users can insert their profile on registration"
ON users FOR INSERT
WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- ROOMS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active rooms" ON rooms;
CREATE POLICY "Users can view active rooms"
ON rooms FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can create rooms" ON rooms;
CREATE POLICY "Authenticated users can create rooms"
ON rooms FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update room details" ON rooms;
CREATE POLICY "Admins can update room details"
ON rooms FOR UPDATE
USING (is_room_admin(id) OR created_by = auth.uid() OR auth.uid() IS NULL);

-- ----------------------------------------------------------------------------
-- ROOM_MEMBERS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room members can view membership" ON room_members;
CREATE POLICY "Room members can view membership"
ON room_members FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can join rooms or be added" ON room_members;
CREATE POLICY "Users can join rooms or be added"
ON room_members FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Members can update their membership" ON room_members;
CREATE POLICY "Members can update their membership"
ON room_members FOR UPDATE
USING (true);

-- ----------------------------------------------------------------------------
-- MESSAGES POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view room messages" ON messages;
CREATE POLICY "Members can view room messages"
ON messages FOR SELECT
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Members can insert messages" ON messages;
CREATE POLICY "Members can insert messages"
ON messages FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Senders can edit their own messages" ON messages;
CREATE POLICY "Senders can edit their own messages"
ON messages FOR UPDATE
USING (sender_id = auth.uid() OR auth.uid() IS NULL);

-- ----------------------------------------------------------------------------
-- MESSAGE_ATTACHMENTS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view attachments" ON message_attachments;
CREATE POLICY "Anyone can view attachments"
ON message_attachments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Senders can upload attachments" ON message_attachments;
CREATE POLICY "Senders can upload attachments"
ON message_attachments FOR INSERT
WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- MESSAGE_REACTIONS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reactions" ON message_reactions;
CREATE POLICY "Anyone can view reactions"
ON message_reactions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can toggle reactions" ON message_reactions;
CREATE POLICY "Users can toggle reactions"
ON message_reactions FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can remove reactions" ON message_reactions;
CREATE POLICY "Users can remove reactions"
ON message_reactions FOR DELETE
USING (true);

-- ----------------------------------------------------------------------------
-- MESSAGE_READ_RECEIPTS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view read receipts" ON message_read_receipts;
CREATE POLICY "Anyone can view read receipts"
ON message_read_receipts FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert read receipts" ON message_read_receipts;
CREATE POLICY "Users can insert read receipts"
ON message_read_receipts FOR INSERT
WITH CHECK (true);
