-- Gacha pity tracking
CREATE TABLE gacha_pity (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    egg_type VARCHAR(30) NOT NULL,  -- 'normal', 'premium', 'legendary', etc.
    pull_count INT NOT NULL DEFAULT 0,
    last_high_grade_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, egg_type)
);

-- World boss (daily cooperative boss)
CREATE TABLE world_boss (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    element VARCHAR(20) NOT NULL,
    max_hp BIGINT NOT NULL,
    current_hp BIGINT NOT NULL,
    reward_gold INT NOT NULL DEFAULT 500,
    reward_gems INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_world_boss_active ON world_boss(expires_at DESC);

-- World boss damage logs
CREATE TABLE world_boss_attacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boss_id INT NOT NULL REFERENCES world_boss(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slime_id UUID NOT NULL,
    damage INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_boss_attacks_boss ON world_boss_attacks(boss_id, user_id);
CREATE INDEX idx_boss_attacks_user ON world_boss_attacks(user_id, boss_id);

-- Daily boss attack limit
-- Tracked in Redis, not in SQL

-- Slime training grounds
CREATE TABLE training_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slime_id UUID NOT NULL REFERENCES slimes(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    slot_number INT NOT NULL DEFAULT 1,
    UNIQUE (user_id, slime_id),
    UNIQUE (user_id, slot_number)
);
CREATE INDEX idx_training_user ON training_slots(user_id);
