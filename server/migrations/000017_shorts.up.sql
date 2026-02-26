-- Shorts main table
CREATE TABLE shorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    video_url TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    duration_ms INT NOT NULL DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(20) NOT NULL DEFAULT 'general',
    visibility VARCHAR(10) NOT NULL DEFAULT 'public',
    linked_species_id INT DEFAULT NULL,
    views INT NOT NULL DEFAULT 0,
    likes INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shorts_user ON shorts(user_id);
CREATE INDEX idx_shorts_feed ON shorts(status, visibility, created_at DESC);
CREATE INDEX idx_shorts_category ON shorts(category, created_at DESC);

-- Likes
CREATE TABLE shorts_likes (
    short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (short_id, user_id)
);

-- Emoji reactions
CREATE TABLE shorts_reactions (
    short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (short_id, user_id)
);

-- Comments
CREATE TABLE shorts_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shorts_comments_short ON shorts_comments(short_id, created_at);

-- Comment likes
CREATE TABLE shorts_comment_likes (
    comment_id UUID NOT NULL REFERENCES shorts_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (comment_id, user_id)
);

-- View tracking
CREATE TABLE shorts_views (
    short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (short_id, user_id)
);

-- Tips / gifts
CREATE TABLE shorts_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    tip_type VARCHAR(10) NOT NULL,
    amount INT NOT NULL,
    message TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
