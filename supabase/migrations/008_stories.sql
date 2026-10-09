-- ============================================================================
-- 008_stories.sql
-- Description: Persistent stories. Until now stories lived only in the API
--              server's memory and vanished on every restart. A story row keeps
--              the full sanitized story object (media URL, overlays, views,
--              view times, reactions) as JSONB; `expires_at` drives cleanup.
--              `story_close_friends` holds each author's explicit
--              «Близкие друзья» list (usernames).
--              Both tables are written only by the API server (service role),
--              so RLS is enabled without client policies.
-- ============================================================================

CREATE TABLE IF NOT EXISTS stories (
  id          TEXT PRIMARY KEY,
  author      TEXT NOT NULL,
  payload     JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stories_author_idx ON stories (author);
CREATE INDEX IF NOT EXISTS stories_expires_at_idx ON stories (expires_at);

CREATE TABLE IF NOT EXISTS story_close_friends (
  owner       TEXT PRIMARY KEY,
  friends     TEXT[] NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_close_friends ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE stories IS 'Stories (24h, or up to a year when pinned to the profile); payload = sanitized story object';
COMMENT ON TABLE story_close_friends IS 'Explicit close-friends list per author (lower-case usernames)';

-- Story replies keep their story card after a server restart.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS story_reply JSONB;
COMMENT ON COLUMN messages.story_reply IS 'Story card of a reply to a story: authorId, storyId, type, preview, background';
