-- game_logs: unified game action log
CREATE TABLE IF NOT EXISTS game_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    action VARCHAR(30) NOT NULL,
    category VARCHAR(20) NOT NULL,
    detail JSONB NOT NULL DEFAULT '{}',
    gold_delta BIGINT NOT NULL DEFAULT 0,
    gems_delta INT NOT NULL DEFAULT 0,
    stardust_delta INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_logs_user_id ON game_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_action ON game_logs (action);
CREATE INDEX IF NOT EXISTS idx_game_logs_category ON game_logs (category);
CREATE INDEX IF NOT EXISTS idx_game_logs_created_at ON game_logs (created_at DESC);

-- support_tickets: customer support
CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    subject VARCHAR(200) NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'general',
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    priority VARCHAR(10) NOT NULL DEFAULT 'normal',
    assigned_to VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);

-- support_replies: ticket thread messages
CREATE TABLE IF NOT EXISTS support_replies (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL DEFAULT 'user',
    sender_id VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_replies_ticket_id ON support_replies (ticket_id);

-- announcements: add published_at and category columns if not exist
DO $$ BEGIN
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'general';
EXCEPTION WHEN others THEN NULL;
END $$;
