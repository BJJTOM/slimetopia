CREATE TABLE IF NOT EXISTS collection_milestones (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone INT NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, milestone)
);
