-- ===== Nurture & Merge Enhancement: Talents, Awakening, Skills, Directed Training =====

-- 1. Talent stats (IV-like system, 0-31 each)
ALTER TABLE slimes ADD COLUMN IF NOT EXISTS talent_str INT NOT NULL DEFAULT 0;
ALTER TABLE slimes ADD COLUMN IF NOT EXISTS talent_vit INT NOT NULL DEFAULT 0;
ALTER TABLE slimes ADD COLUMN IF NOT EXISTS talent_spd INT NOT NULL DEFAULT 0;
ALTER TABLE slimes ADD COLUMN IF NOT EXISTS talent_int INT NOT NULL DEFAULT 0;
ALTER TABLE slimes ADD COLUMN IF NOT EXISTS talent_cha INT NOT NULL DEFAULT 0;
ALTER TABLE slimes ADD COLUMN IF NOT EXISTS talent_lck INT NOT NULL DEFAULT 0;

-- 2. Awakening (Star) system
ALTER TABLE slimes ADD COLUMN IF NOT EXISTS star_level INT NOT NULL DEFAULT 0;

-- 3. Skills table (per-species skill definitions)
CREATE TABLE IF NOT EXISTS game_skills (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '⚡',
    skill_type TEXT NOT NULL DEFAULT 'passive' CHECK (skill_type IN ('passive', 'active')),
    element_affinity TEXT DEFAULT NULL,
    grade_req TEXT NOT NULL DEFAULT 'common',
    level_req INT NOT NULL DEFAULT 1,
    effect JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Species → Skill mapping (which species can learn which skills)
CREATE TABLE IF NOT EXISTS game_species_skills (
    species_id INT NOT NULL REFERENCES slime_species(id) ON DELETE CASCADE,
    skill_id INT NOT NULL REFERENCES game_skills(id) ON DELETE CASCADE,
    learn_level INT NOT NULL DEFAULT 5,
    slot INT NOT NULL DEFAULT 1 CHECK (slot BETWEEN 1 AND 3),
    PRIMARY KEY (species_id, skill_id)
);

-- 5. Slime learned skills
CREATE TABLE IF NOT EXISTS slime_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slime_id UUID NOT NULL REFERENCES slimes(id) ON DELETE CASCADE,
    skill_id INT NOT NULL REFERENCES game_skills(id) ON DELETE CASCADE,
    slot INT NOT NULL CHECK (slot BETWEEN 1 AND 3),
    inherited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(slime_id, slot)
);
CREATE INDEX IF NOT EXISTS idx_slime_skills_slime ON slime_skills(slime_id);

-- 6. Training mode support
ALTER TABLE training_slots ADD COLUMN IF NOT EXISTS training_mode TEXT NOT NULL DEFAULT 'balanced';

-- 7. Seed some default skills (based on elements and grades)
INSERT INTO game_skills (name, name_en, description, icon, skill_type, element_affinity, grade_req, level_req, effect) VALUES
-- Water skills
('물의 축복', 'Water Blessing', '물 속성 슬라임의 컨디션 유지력 강화', '💧', 'passive', 'water', 'common', 5, '{"condition_decay_reduce": 0.3}'),
('치유의 물결', 'Healing Wave', '목욕 시 컨디션 회복량 +50%', '🌊', 'passive', 'water', 'rare', 10, '{"bath_bonus": 0.5}'),
('해일', 'Tsunami', '월드보스 데미지 +20%', '🌊', 'active', 'water', 'epic', 20, '{"boss_damage": 0.2}'),
-- Fire skills
('불꽃 의지', 'Flame Will', '훈련 EXP +15%', '🔥', 'passive', 'fire', 'common', 5, '{"training_exp_bonus": 0.15}'),
('용암 갑옷', 'Lava Armor', '컨디션 감소 저항 +30%', '🛡️', 'passive', 'fire', 'rare', 10, '{"condition_decay_reduce": 0.3}'),
('업화', 'Inferno', '레이스 스피드 +25%', '💥', 'active', 'fire', 'epic', 20, '{"race_speed": 0.25}'),
-- Grass skills
('자연의 은혜', 'Nature Grace', '배고픔 감소 속도 -20%', '🌿', 'passive', 'grass', 'common', 5, '{"hunger_decay_reduce": 0.2}'),
('광합성', 'Photosynthesis', '낮 시간 EXP +10%', '☀️', 'passive', 'grass', 'rare', 10, '{"day_exp_bonus": 0.1}'),
('월드 트리', 'World Tree', '모든 스탯 +5', '🌳', 'active', 'grass', 'epic', 20, '{"all_stats": 5}'),
-- Universal skills (any element)
('행운의 별', 'Lucky Star', '합성 대성공 확률 +10%', '⭐', 'passive', NULL, 'uncommon', 8, '{"great_success_bonus": 0.1}'),
('속성 친화', 'Elemental Affinity', '탐험 보상 +10%', '🔮', 'passive', NULL, 'rare', 12, '{"explore_bonus": 0.1}'),
('투지', 'Fighting Spirit', '월드보스 데미지 +10%', '💪', 'passive', NULL, 'uncommon', 7, '{"boss_damage": 0.1}'),
-- Light/Dark
('빛의 가호', 'Light Blessing', '친밀도 상승량 +20%', '✨', 'passive', 'light', 'common', 5, '{"affection_bonus": 0.2}'),
('어둠의 힘', 'Dark Power', '레이스 크리티컬 +15%', '🌑', 'passive', 'dark', 'common', 5, '{"race_crit": 0.15}'),
-- Ice/Electric
('빙결', 'Freeze', '상대 레이스 속도 -10%', '❄️', 'active', 'ice', 'rare', 10, '{"race_slow": 0.1}'),
('번개 가속', 'Lightning Rush', '쿨다운 -15%', '⚡', 'passive', 'electric', 'common', 5, '{"cooldown_reduce": 0.15}'),
-- High-tier
('신의 축복', 'Divine Blessing', '모든 보상 +15%', '👑', 'passive', 'celestial', 'legendary', 25, '{"all_rewards": 0.15}'),
('독의 면역', 'Poison Immunity', '질병 면역', '☠️', 'passive', 'poison', 'rare', 10, '{"sick_immune": true}'),
('대지의 힘', 'Earth Power', '훈련 재능 성장 +25%', '🏔️', 'passive', 'earth', 'uncommon', 8, '{"talent_growth_bonus": 0.25}'),
('바람의 속삭임', 'Wind Whisper', '이동속도 +20%, 레이스 보너스', '🍃', 'passive', 'wind', 'common', 5, '{"race_speed": 0.2}');

-- 8. Awakening costs (grade-based)
CREATE TABLE IF NOT EXISTS game_awakening_costs (
    grade TEXT NOT NULL,
    star_level INT NOT NULL CHECK (star_level BETWEEN 1 AND 3),
    gold_cost INT NOT NULL DEFAULT 0,
    stardust_cost INT NOT NULL DEFAULT 0,
    material_id INT DEFAULT NULL,
    material_qty INT NOT NULL DEFAULT 0,
    PRIMARY KEY (grade, star_level)
);

INSERT INTO game_awakening_costs (grade, star_level, gold_cost, stardust_cost) VALUES
('common', 1, 500, 50), ('common', 2, 1500, 150), ('common', 3, 5000, 500),
('uncommon', 1, 1000, 100), ('uncommon', 2, 3000, 300), ('uncommon', 3, 10000, 1000),
('rare', 1, 2000, 200), ('rare', 2, 6000, 600), ('rare', 3, 20000, 2000),
('epic', 1, 5000, 500), ('epic', 2, 15000, 1500), ('epic', 3, 50000, 5000),
('legendary', 1, 10000, 1000), ('legendary', 2, 30000, 3000), ('legendary', 3, 100000, 10000),
('mythic', 1, 25000, 2500), ('mythic', 2, 75000, 7500), ('mythic', 3, 250000, 25000);

-- 9. Randomize talents for all existing slimes
UPDATE slimes SET
    talent_str = floor(random() * 32),
    talent_vit = floor(random() * 32),
    talent_spd = floor(random() * 32),
    talent_int = floor(random() * 32),
    talent_cha = floor(random() * 32),
    talent_lck = floor(random() * 32)
WHERE talent_str = 0 AND talent_vit = 0 AND talent_spd = 0;
