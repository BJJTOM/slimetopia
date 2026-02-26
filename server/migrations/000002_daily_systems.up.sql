-- Daily mission tracking
CREATE TABLE daily_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_id INT NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    target INT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    claimed BOOLEAN NOT NULL DEFAULT false,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_daily_missions_user_mission_date ON daily_missions(user_id, mission_id, date);
CREATE INDEX idx_daily_missions_user_date ON daily_missions(user_id, date);

-- Attendance tracking
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    day_number INT NOT NULL DEFAULT 1,
    reward_claimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_attendance_user_date ON attendance(user_id, date);

-- Recipe discovery tracking
CREATE TABLE recipe_discoveries (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INT NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, recipe_id)
);

-- Evolution tree unlock tracking
CREATE TABLE evolution_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species_id INT NOT NULL REFERENCES slime_species(id),
    node_id INT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_evolution_unlocks_user_species_node ON evolution_unlocks(user_id, species_id, node_id);

-- Race results
CREATE TABLE race_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slime_id UUID REFERENCES slimes(id) ON DELETE SET NULL,
    score INT NOT NULL DEFAULT 0,
    gold_reward INT NOT NULL DEFAULT 0,
    exp_reward INT NOT NULL DEFAULT 0,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_race_results_user ON race_results(user_id, played_at DESC);
