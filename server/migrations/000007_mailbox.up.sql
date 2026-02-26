-- Mailbox system
CREATE TABLE mailbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = global announcement
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    mail_type VARCHAR(20) NOT NULL DEFAULT 'announcement',
    reward_gold BIGINT NOT NULL DEFAULT 0,
    reward_gems INT NOT NULL DEFAULT 0,
    read BOOLEAN NOT NULL DEFAULT false,
    claimed BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mailbox_user ON mailbox(user_id, created_at DESC);

CREATE TABLE mailbox_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mail_id UUID NOT NULL REFERENCES mailbox(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    claimed BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(mail_id, user_id)
);

-- Collection entries (species x personality unique combinations)
CREATE TABLE collection_entries (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species_id INT NOT NULL REFERENCES slime_species(id),
    personality VARCHAR(15) NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, species_id, personality)
);

-- Backfill existing slimes into collection
INSERT INTO collection_entries (user_id, species_id, personality, discovered_at)
SELECT DISTINCT user_id, species_id, personality, MIN(created_at)
FROM slimes GROUP BY user_id, species_id, personality
ON CONFLICT DO NOTHING;

-- Welcome mail for all users
INSERT INTO mailbox (user_id, title, body, mail_type, reward_gold, reward_gems)
VALUES (NULL, '슬라임토피아에 오신 것을 환영합니다!', '999마리의 슬라임을 모아 전설의 수집가가 되어보세요! 환영 선물을 수령해주세요.', 'reward', 500, 5);
