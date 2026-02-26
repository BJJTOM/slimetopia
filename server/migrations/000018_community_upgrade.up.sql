-- Community Enhancement: multi-image, views, hierarchical replies, report, block

-- Add image_urls array and view_count to posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

-- Add parent_id for hierarchical replies (1-level nesting)
ALTER TABLE community_replies ADD COLUMN IF NOT EXISTS parent_id UUID DEFAULT NULL REFERENCES community_replies(id) ON DELETE CASCADE;
ALTER TABLE community_replies ADD COLUMN IF NOT EXISTS reply_count INT NOT NULL DEFAULT 0;

-- Report system
CREATE TABLE IF NOT EXISTS community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(10) NOT NULL,  -- 'post' | 'reply' | 'user'
    target_id UUID NOT NULL,
    reason VARCHAR(20) NOT NULL,       -- 'spam', 'abuse', 'inappropriate', 'other'
    detail TEXT DEFAULT '',
    status VARCHAR(10) NOT NULL DEFAULT 'pending',  -- 'pending', 'reviewed', 'dismissed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_reports_target ON community_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter ON community_reports(reporter_id);

-- Block system
CREATE TABLE IF NOT EXISTS community_blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

-- Post view tracking (unique per user)
CREATE TABLE IF NOT EXISTS community_post_views (
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);
