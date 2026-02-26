-- ===== Community Enhancements: reactions, bookmarks, search, polls =====

-- 1. Emoji Reactions table
CREATE TABLE IF NOT EXISTS community_post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('❤️','😂','😮','😢','🔥','👏')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON community_post_reactions(post_id);

-- Add reaction_counts JSONB column to posts for denormalized counts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS reaction_counts JSONB NOT NULL DEFAULT '{}';

-- 2. Bookmarks table
CREATE TABLE IF NOT EXISTS community_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON community_bookmarks(user_id, created_at DESC);

-- Add bookmark_count column to posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS bookmark_count INT NOT NULL DEFAULT 0;

-- 3. Full-text search support
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Build search vector from existing content
UPDATE community_posts SET search_vector = to_tsvector('simple', coalesce(content, ''));

-- Create GIN index for fast FTS
CREATE INDEX IF NOT EXISTS idx_posts_search ON community_posts USING GIN(search_vector);

-- Trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION community_posts_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('simple', coalesce(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_posts_search ON community_posts;
CREATE TRIGGER trg_community_posts_search
    BEFORE INSERT OR UPDATE OF content ON community_posts
    FOR EACH ROW EXECUTE FUNCTION community_posts_search_trigger();

-- 4. Polls tables
CREATE TABLE IF NOT EXISTS community_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL UNIQUE REFERENCES community_posts(id) ON DELETE CASCADE,
    options JSONB NOT NULL DEFAULT '[]',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_index INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON community_poll_votes(poll_id);
