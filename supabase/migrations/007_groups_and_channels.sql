-- ============================================================================
-- 007_groups_and_channels.sql
-- Description: Telegram-style groups and channels. Adds the 'channel' room
--              type, a public @username and a JSONB `settings` blob holding
--              the owner, admins (rights + custom titles), member permissions,
--              slow mode, invite links, ban list and shared pins.
-- ============================================================================

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_type_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_type_check CHECK (type IN ('direct', 'group', 'channel'));

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS username VARCHAR(32);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS rooms_username_unique ON rooms (lower(username)) WHERE username IS NOT NULL;

COMMENT ON COLUMN rooms.username IS 'Public @username of a group/channel (t.me/<username>); NULL = private';
COMMENT ON COLUMN rooms.settings IS 'ownerId, admins, permissions, slowMode, signMessages, inviteLinks, banned, pinnedIds';
